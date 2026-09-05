/**
 * Configuração da API Bibliofilia (espelha frontend_dev/src/config.js).
 * Persistida em chrome.storage.local sob a chave `apiEnv`.
 */
(function (root) {
  const ENVIRONMENTS = {
    prod: {
      id: 'prod',
      label: 'Produção',
      apiBase: 'https://backend-goby.onrender.com/api',
    },
    dev: {
      id: 'dev',
      label: 'Desenvolvimento',
      apiBase: 'https://backend-dev-ypsu.onrender.com/api',
    },
    local: {
      id: 'local',
      label: 'Local',
      apiBase: 'http://localhost:3001/api',
    },
  };

  const DEFAULT_ENV = 'prod';
  const STORAGE_KEYS = {
    apiEnv: 'apiEnv',
    authToken: 'authToken',
    authUser: 'authUser',
    authExpiresAt: 'authExpiresAt',
    fabPosition: 'fabPosition',
    lastSyncAt: 'lastSyncAt',
  };

  function getEnvironment(id) {
    return ENVIRONMENTS[id] || ENVIRONMENTS[DEFAULT_ENV];
  }

  async function getStoredEnvId() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(STORAGE_KEYS.apiEnv);
      return data[STORAGE_KEYS.apiEnv] || DEFAULT_ENV;
    }
    return DEFAULT_ENV;
  }

  async function getApiBase() {
    const envId = await getStoredEnvId();
    return getEnvironment(envId).apiBase;
  }

  async function setApiEnv(envId) {
    if (!ENVIRONMENTS[envId]) throw new Error('Ambiente inválido');
    await chrome.storage.local.set({ [STORAGE_KEYS.apiEnv]: envId });
    return getEnvironment(envId);
  }

  root.BibliofiliaConfig = {
    ENVIRONMENTS,
    DEFAULT_ENV,
    STORAGE_KEYS,
    getEnvironment,
    getStoredEnvId,
    getApiBase,
    setApiEnv,
  };
})(typeof self !== 'undefined' ? self : window);
