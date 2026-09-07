/**
 * Content-script side: injeta caixaHook.page.js no MAIN world e escuta postMessage.
 */
(function (root) {
  const SOURCE = 'bibliofilia-caixa-hook';
  const EVENT = 'CAIXA_SAVED';
  let installed = false;
  let lastPayload = null;

  function installPageHook() {
    if (installed) return;
    installed = true;
    try {
      const src = chrome.runtime.getURL('content/caixaHook.page.js');
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return;
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      (document.documentElement || document.head || document.body).appendChild(script);
      script.addEventListener('load', () => {
        try { script.remove(); } catch (_) { /* ignore */ }
      });
    } catch (err) {
      console.warn('[Bibliofilia] falha ao injetar hook de caixa', err);
    }
  }

  function onMessage(handler) {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== SOURCE || data.type !== EVENT) return;
      lastPayload = data.payload;
      handler(data.payload);
    });
  }

  function getLastPayload() {
    return lastPayload;
  }

  function setLastPayload(payload) {
    lastPayload = payload;
  }

  root.BibliofiliaCaixaHook = {
    installPageHook,
    onMessage,
    getLastPayload,
    setLastPayload,
    SOURCE,
    EVENT,
  };
})(typeof self !== 'undefined' ? self : window);
