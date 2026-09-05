/**
 * Cliente HTTP da API Bibliofilia (service worker).
 */
import { getApiBase, STORAGE_KEYS } from './config-sw.js';

async function getAuthToken() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.authToken, STORAGE_KEYS.authExpiresAt]);
  if (!data[STORAGE_KEYS.authToken]) return null;
  const expiresAt = data[STORAGE_KEYS.authExpiresAt];
  if (expiresAt && Date.parse(expiresAt) < Date.now()) {
    return null;
  }
  return data[STORAGE_KEYS.authToken];
}

async function apiFetch(path, { method = 'GET', body = null, auth = true } = {}) {
  const apiBase = await getApiBase();
  const headers = {
    Accept: 'application/json',
  };
  if (body != null) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getAuthToken();
    if (!token) {
      const err = new Error('Extensão não vinculada. Abra o popup e informe o código de vínculo.');
      err.code = 'NOT_LINKED';
      throw err;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message || data.details))
      || `Erro HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function exchangePairingCode(code) {
  const extensionId = chrome.runtime.id;
  const data = await apiFetch('/chrome-extension/pairing/exchange', {
    method: 'POST',
    auth: false,
    body: { code, extensionId },
  });
  await chrome.storage.local.set({
    [STORAGE_KEYS.authToken]: data.token,
    [STORAGE_KEYS.authUser]: data.user || null,
    [STORAGE_KEYS.authExpiresAt]: data.expiresAt || null,
    [STORAGE_KEYS.lastSyncAt]: new Date().toISOString(),
  });
  return data;
}

export async function disconnect() {
  try {
    await apiFetch('/chrome-extension/pairing/revoke', { method: 'POST' });
  } catch (_) {
    // ignore — still clear local
  }
  await chrome.storage.local.remove([
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.authUser,
    STORAGE_KEYS.authExpiresAt,
  ]);
}

export async function getAuthStatus() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.authUser,
    STORAGE_KEYS.authExpiresAt,
    STORAGE_KEYS.lastSyncAt,
    STORAGE_KEYS.apiEnv,
  ]);
  const token = data[STORAGE_KEYS.authToken];
  const expiresAt = data[STORAGE_KEYS.authExpiresAt];
  const expired = expiresAt ? Date.parse(expiresAt) < Date.now() : false;
  return {
    linked: Boolean(token) && !expired,
    expired,
    user: data[STORAGE_KEYS.authUser] || null,
    expiresAt: expiresAt || null,
    lastSyncAt: data[STORAGE_KEYS.lastSyncAt] || null,
    apiEnv: data[STORAGE_KEYS.apiEnv] || 'prod',
  };
}

export async function importOsByCodigo(codigoOs) {
  const data = await apiFetch('/cartosoft-integration/ordens-servico/import-by-codigo', {
    method: 'POST',
    body: { codigoOs },
  });
  await chrome.storage.local.set({
    [STORAGE_KEYS.lastSyncAt]: new Date().toISOString(),
  });
  try {
    await apiFetch('/chrome-extension/sync-heartbeat', { method: 'POST', body: {} });
  } catch (_) {
    // optional
  }
  return data;
}
