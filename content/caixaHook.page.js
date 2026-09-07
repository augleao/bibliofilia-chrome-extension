/**
 * Roda no MAIN world da página Cartosoft (via web_accessible_resources).
 * Intercepta POST /api-sistema-registro/caixa e notifica o content script.
 */
(function () {
  if (window.__bibliofiliaCaixaHook) return;
  window.__bibliofiliaCaixaHook = true;

  const SOURCE = 'bibliofilia-caixa-hook';
  const EVENT = 'CAIXA_SAVED';

  function isCaixaUrl(url) {
    try {
      return /\/api-sistema-registro\/caixa\/?(\?|$)/i.test(String(url || ''));
    } catch (_) {
      return false;
    }
  }

  function parseBody(body) {
    if (body == null) return null;
    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function emit(caixa, meta) {
    try {
      window.postMessage({
        source: SOURCE,
        type: EVENT,
        payload: { caixa: caixa, at: Date.now(), ...(meta || {}) },
      }, '*');
    } catch (_) {
      // ignore
    }
  }

  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = async function (...args) {
      const input = args[0];
      const init = args[1] || {};
      const url = typeof input === 'string' ? input : (input && input.url);
      const method = String(init.method || (input && input.method) || 'GET').toUpperCase();
      const bodyText = init.body;
      const res = await origFetch.apply(this, args);
      try {
        if (method === 'POST' && isCaixaUrl(url) && res && res.ok) {
          const caixa = parseBody(bodyText);
          if (caixa && Array.isArray(caixa.pagamentos) && caixa.pagamentos.length) {
            emit(caixa, { via: 'fetch', status: res.status });
          }
        }
      } catch (_) {
        // ignore
      }
      return res;
    };
  }

  const XHR = window.XMLHttpRequest;
  if (XHR && XHR.prototype) {
    const open = XHR.prototype.open;
    const send = XHR.prototype.send;
    XHR.prototype.open = function (method, url, ...rest) {
      this.__biblioMethod = String(method || 'GET').toUpperCase();
      this.__biblioUrl = url;
      return open.call(this, method, url, ...rest);
    };
    XHR.prototype.send = function (body) {
      try {
        if (this.__biblioMethod === 'POST' && isCaixaUrl(this.__biblioUrl)) {
          this.addEventListener('load', function onLoad() {
            try {
              if (this.status >= 200 && this.status < 300) {
                const caixa = parseBody(body);
                if (caixa && Array.isArray(caixa.pagamentos) && caixa.pagamentos.length) {
                  emit(caixa, { via: 'xhr', status: this.status });
                }
              }
            } catch (_) {
              // ignore
            }
          });
        }
      } catch (_) {
        // ignore
      }
      return send.call(this, body);
    };
  }
})();
