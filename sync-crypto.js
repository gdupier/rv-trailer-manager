'use strict';

/* Passphrase → encryption key + household lookup token (Web Crypto). */
window.RVSyncCrypto = (function () {
  const PBKDF2_ITER = 120000;
  const SALT_BYTES = 16;

  function bufToHex(buf) {
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function hexToBuf(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }

  function b64Encode(buf) {
    let s = '';
    const u8 = new Uint8Array(buf);
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }

  function b64Decode(str) {
    const s = atob(str);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  async function deriveKeyMaterial(passphrase, saltB64) {
    const enc = new TextEncoder();
    const salt = saltB64 ? b64Decode(saltB64) : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
      baseKey, 256
    );
    const keyBytes = new Uint8Array(bits);
    const aesKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    const lookupHash = await crypto.subtle.digest('SHA-256', enc.encode(bufToHex(keyBytes) + ':rv-sync-lookup'));
    return {
      saltB64: b64Encode(salt),
      keyHex: bufToHex(keyBytes),
      lookupToken: bufToHex(lookupHash),
      aesKey,
    };
  }

  async function encryptJson(aesKey, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(obj));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plain);
    return { ciphertext: b64Encode(cipher), iv: b64Encode(iv) };
  }

  async function decryptJson(aesKey, ciphertextB64, ivB64) {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64Decode(ivB64) },
      aesKey,
      b64Decode(ciphertextB64)
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  async function keyFromHex(keyHex) {
    return crypto.subtle.importKey('raw', hexToBuf(keyHex), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  return { deriveKeyMaterial, encryptJson, decryptJson, keyFromHex, b64Encode, b64Decode };
})();
