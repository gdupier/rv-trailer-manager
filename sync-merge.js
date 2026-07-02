'use strict';

/* Merge two app state blobs — per-checkbox timestamps for active trips. */
window.RVSyncMerge = (function () {
  function stampTime(entry) {
    if (!entry) return 0;
    if (entry === true) return 0;
    return entry.at || 0;
  }

  function isStampOn(entry) {
    if (!entry) return false;
    if (entry === true) return true;
    return !!entry.on;
  }

  function mergeStampMap(a, b) {
    const out = {};
    const ids = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const id of ids) {
      const ea = a && a[id];
      const eb = b && b[id];
      if (!ea && !eb) continue;
      if (!ea) { out[id] = eb; continue; }
      if (!eb) { out[id] = ea; continue; }
      out[id] = stampTime(ea) >= stampTime(eb) ? ea : eb;
    }
    return out;
  }

  function itemTime(item) {
    if (!item) return 0;
    if (item.updatedAt) return item.updatedAt;
    if (item.endDate) return Date.parse(item.endDate) || 0;
    if (item.startDate) return Date.parse(item.startDate) || 0;
    if (item.start) return Date.parse(item.start) || 0;
    return 0;
  }

  function mergeArrayById(local, remote) {
    const map = new Map();
    // Remote first, local second — on equal timestamps local wins (user's device).
    for (const item of [...(remote || []), ...(local || [])]) {
      if (!item || !item.id) continue;
      const prev = map.get(item.id);
      if (!prev || itemTime(item) >= itemTime(prev)) map.set(item.id, item);
    }
    return [...map.values()];
  }

  function mergeCurrentTrip(a, b, localMeta, remoteMeta) {
    if (!a && !b) return null;
    if (!a && b) {
      if ((localMeta?.updatedAt || 0) > (remoteMeta?.updatedAt || 0)) return null;
      return { ...b };
    }
    if (a && !b) return { ...a };
    if (a.id !== b.id) {
      return (a.updatedAt || 0) >= (b.updatedAt || 0) ? { ...a } : { ...b };
    }
    const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
    return {
      id: a.id,
      name: newer.name,
      place: newer.place,
      startDate: a.startDate || b.startDate,
      updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
      checks: mergeStampMap(a.checks, b.checks),
      packed: mergeStampMap(a.packed, b.packed),
    };
  }

  function mergeStates(local, remote, deviceId) {
    const l = local || {};
    const r = remote || {};
    const useLocalTemplates = (l.meta?.updatedAt || 0) >= (r.meta?.updatedAt || 0);
    return {
      schemaVersion: Math.max(l.schemaVersion || 0, r.schemaVersion || 0),
      meta: {
        revision: Math.max(l.meta?.revision || 0, r.meta?.revision || 0) + 1,
        updatedAt: Date.now(),
        deviceId: deviceId || l.meta?.deviceId || r.meta?.deviceId || 'unknown',
      },
      checklists: useLocalTemplates ? l.checklists : r.checklists,
      inventory: useLocalTemplates ? l.inventory : r.inventory,
      rig: useLocalTemplates ? l.rig : r.rig,
      currentTrip: mergeCurrentTrip(l.currentTrip, r.currentTrip, l.meta, r.meta),
      planned: mergeArrayById(l.planned, r.planned),
      history: mergeArrayById(l.history, r.history),
    };
  }

  return { mergeStates, mergeStampMap, isStampOn, stampTime };
})();
