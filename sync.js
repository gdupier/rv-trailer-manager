'use strict';

/* Firebase Realtime Database sync — encrypted household blob. */
window.RVSync = (function () {
  const SYNC_KEY = 'rvSync_v1';
  const PUSH_DELAY_MS = 2500;

  let pushTimer = null;
  let pushing = false;
  let aesKey = null;
  const status = { state: 'off', lastSync: null, lastError: null, busy: false };

  function cfg() { return window.RV_FIREBASE || {}; }

  function isConfigured() {
    const c = cfg();
    return !!(c.enabled && c.databaseURL && !c.databaseURL.includes('YOUR_PROJECT_ID'));
  }

  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || null; }
    catch (e) { return null; }
  }

  function saveSettings(s) {
    localStorage.setItem(SYNC_KEY, JSON.stringify(s));
  }

  function isEnabled() {
    const s = loadSettings();
    return !!(s && s.enabled && s.lookupToken && s.keyHex);
  }

  async function loadAesKey() {
    if (aesKey) return aesKey;
    const s = loadSettings();
    if (!s || !s.keyHex) return null;
    aesKey = await window.RVSyncCrypto.keyFromHex(s.keyHex);
    return aesKey;
  }

  function syncUrl(token) {
    const base = cfg().databaseURL.replace(/\/$/, '');
    return `${base}/sync/${token}.json`;
  }

  function setStatus(patch) {
    Object.assign(status, patch);
    if (window.RVApp && window.RVApp.onSyncStatus) window.RVApp.onSyncStatus(status);
  }

  async function fetchRemote(token) {
    const res = await fetch(syncUrl(token), { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Could not reach sync server (' + res.status + ')');
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return data;
  }

  async function putRemote(token, payload) {
    const res = await fetch(syncUrl(token), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Upload failed (' + res.status + ')');
    return res.json();
  }

  async function enableSync(passphrase, rememberOnDevice) {
    if (!isConfigured()) throw new Error('Firebase is not configured yet — see FIREBASE_SETUP.md');
    if (!passphrase || passphrase.length < 8) throw new Error('Use a passphrase of at least 8 characters');

    const material = await window.RVSyncCrypto.deriveKeyMaterial(passphrase, null);
    aesKey = material.aesKey;

    const settings = {
      enabled: true,
      lookupToken: material.lookupToken,
      saltB64: material.saltB64,
      rememberOnDevice: !!rememberOnDevice,
      keyHex: rememberOnDevice ? material.keyHex : undefined,
    };
    saveSettings(settings);

    setStatus({ state: 'on', lastError: null });
    await syncNow();
    return settings;
  }

  function disableSync() {
    localStorage.removeItem(SYNC_KEY);
    aesKey = null;
    setStatus({ state: 'off', lastSync: null, lastError: null, busy: false });
    if (window.RVApp && window.RVApp.render) window.RVApp.render();
  }

  async function pullAndMerge() {
    if (!isEnabled() || !window.RVApp) return false;
    const settings = loadSettings();
    const key = await loadAesKey();
    if (!key) throw new Error('Sync key missing — re-enable sync on this device');

    setStatus({ busy: true });
    try {
      const remoteWrap = await fetchRemote(settings.lookupToken);
      if (!remoteWrap) {
        setStatus({ busy: false, lastSync: Date.now() });
        return false;
      }

      const remoteState = await window.RVSyncCrypto.decryptJson(key, remoteWrap.ciphertext, remoteWrap.iv);
      const localState = window.RVApp.getState();
      const merged = window.RVSyncMerge.mergeStates(localState, remoteState, window.RVApp.deviceId());
      window.RVApp.setState(merged, { localOnly: true });
      setStatus({ busy: false, lastSync: Date.now(), lastError: null });
      return true;
    } catch (e) {
      setStatus({ busy: false, lastError: e.message || String(e) });
      throw e;
    }
  }

  async function pushLocal() {
    if (!isEnabled() || !window.RVApp || pushing) return;
    if (!navigator.onLine) {
      setStatus({ state: 'offline' });
      return;
    }

    const settings = loadSettings();
    const key = await loadAesKey();
    if (!key) return;

    pushing = true;
    setStatus({ busy: true, state: 'syncing' });
    try {
      let remoteWrap = await fetchRemote(settings.lookupToken);
      let stateToPush = window.RVApp.getState();

      if (remoteWrap) {
        const remoteState = await window.RVSyncCrypto.decryptJson(key, remoteWrap.ciphertext, remoteWrap.iv);
        stateToPush = window.RVSyncMerge.mergeStates(stateToPush, remoteState, window.RVApp.deviceId());
        window.RVApp.setState(stateToPush, { localOnly: true });
      }

      if (!stateToPush.meta) stateToPush.meta = { revision: 1, updatedAt: Date.now() };
      const encrypted = await window.RVSyncCrypto.encryptJson(key, stateToPush);
      const revision = (remoteWrap && remoteWrap.revision) ? Math.max(remoteWrap.revision, stateToPush.meta.revision || 0) + 1 : (stateToPush.meta.revision || 1);

      await putRemote(settings.lookupToken, {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        revision,
        updatedAt: Date.now(),
      });

      setStatus({ busy: false, lastSync: Date.now(), lastError: null, state: 'on' });
    } catch (e) {
      setStatus({ busy: false, lastError: e.message || String(e), state: navigator.onLine ? 'error' : 'offline' });
    } finally {
      pushing = false;
    }
  }

  function schedulePush() {
    if (!isEnabled()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushLocal(), PUSH_DELAY_MS);
  }

  async function syncNow() {
    if (!isEnabled()) return;
    try {
      await pullAndMerge();
      await pushLocal();
      if (window.RVApp && window.RVApp.render) window.RVApp.render();
    } catch (e) {
      if (window.RVApp && window.RVApp.toast) window.RVApp.toast('Sync failed: ' + (e.message || e));
    }
  }

  function init() {
    if (isEnabled()) {
      setStatus({ state: isConfigured() ? 'on' : 'needs-config' });
      if (isConfigured() && navigator.onLine) {
        syncNow().catch(() => {});
      }
    }

    window.addEventListener('online', () => {
      if (isEnabled()) syncNow().catch(() => {});
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isEnabled() && navigator.onLine) {
        syncNow().catch(() => {});
      }
    });
  }

  function getStatus() { return { ...status, enabled: isEnabled(), configured: isConfigured() }; }

  return {
    init, enableSync, disableSync, schedulePush, syncNow, pullAndMerge, pushLocal,
    getStatus, isEnabled, isConfigured, loadSettings,
  };
})();
