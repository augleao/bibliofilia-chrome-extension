/**
 * Config helpers para ES modules no service worker.
 * Espelha shared/config.js sem depender de IIFE no SW.
 */
export const ENVIRONMENTS = {
  prod: {
    id: 'prod',
    label: 'Produção',
    apiBase: 'https://backend-goby.onrender.com/api',
    frontendBase: 'https://www.bibliofilia.com.br',
  },
  dev: {
    id: 'dev',
    label: 'Desenvolvimento',
    apiBase: 'https://backend-dev-ypsu.onrender.com/api',
    frontendBase: 'https://frontend-dev-e7yt.onrender.com',
  },
  local: {
    id: 'local',
    label: 'Local',
    apiBase: 'http://localhost:3001/api',
    frontendBase: 'http://localhost:3000',
  },
};

export const DEFAULT_ENV = 'prod';

export const STORAGE_KEYS = {
  apiEnv: 'apiEnv',
  authToken: 'authToken',
  authUser: 'authUser',
  authExpiresAt: 'authExpiresAt',
  fabPosition: 'fabPosition',
  lastSyncAt: 'lastSyncAt',
};

export function getEnvironment(id) {
  return ENVIRONMENTS[id] || ENVIRONMENTS[DEFAULT_ENV];
}

export async function getStoredEnvId() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.apiEnv);
  return data[STORAGE_KEYS.apiEnv] || DEFAULT_ENV;
}

export async function getApiBase() {
  const envId = await getStoredEnvId();
  return getEnvironment(envId).apiBase;
}

export async function getFrontendBase() {
  const envId = await getStoredEnvId();
  return getEnvironment(envId).frontendBase;
}

export async function setApiEnv(envId) {
  if (!ENVIRONMENTS[envId]) throw new Error('Ambiente inválido');
  await chrome.storage.local.set({ [STORAGE_KEYS.apiEnv]: envId });
  return getEnvironment(envId);
}
