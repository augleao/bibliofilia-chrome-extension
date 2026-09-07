/**
 * Extração robusta do código da OS a partir da URL do CartosoftWeb.
 * Ex.: https://cartosoftweb.recivil.com.br/cartosoft-web/ordem-de-servico/editar/AUR2600013230
 * Também lê returnTo em /cadastrar-caixa/{id}?returnTo=/ordem-de-servico/editar/{codigo}
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BibliofiliaUrl = api;
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : undefined, function factory() {
  const OS_EDIT_PATH = /\/ordem-de-servico\/editar\/([^/?#]+)/i;
  const CAIXA_PATH = /\/cadastrar-caixa\/([^/?#]+)/i;
  const OS_CODE_RE = /^[A-Za-z0-9]{6,40}$/;

  function normalizeCodigo(raw) {
    let codigo = decodeURIComponent(String(raw || '')).trim().toUpperCase();
    codigo = codigo.replace(/[^A-Z0-9].*$/, '');
    if (!OS_CODE_RE.test(codigo)) return null;
    return codigo;
  }

  function pathnameFromHref(href) {
    const raw = String(href || '').trim();
    if (!raw) return '';
    try {
      const BaseURL = typeof URL !== 'undefined' ? URL : null;
      if (BaseURL) {
        return new BaseURL(raw, 'https://cartosoftweb.recivil.com.br').pathname || '';
      }
    } catch (_) {
      // fall through
    }
    const pathMatch = raw.match(/^https?:\/\/[^/]+(\/[^?#]*)/i);
    return pathMatch ? pathMatch[1] : raw;
  }

  function searchParamsFromHref(href) {
    const raw = String(href || '').trim();
    try {
      const BaseURL = typeof URL !== 'undefined' ? URL : null;
      if (BaseURL) {
        return new BaseURL(raw, 'https://cartosoftweb.recivil.com.br').searchParams;
      }
    } catch (_) {
      // fall through
    }
    return null;
  }

  function extractCodigoOsFromUrl(href) {
    const pathname = pathnameFromHref(href);
    const match = String(pathname).match(OS_EDIT_PATH);
    if (match) return normalizeCodigo(match[1]);

    // cadastrar-caixa?returnTo=/ordem-de-servico/editar/NAC...
    const params = searchParamsFromHref(href);
    if (params) {
      const returnTo = params.get('returnTo') || params.get('returnto') || '';
      if (returnTo) {
        const fromReturn = String(returnTo).match(OS_EDIT_PATH);
        if (fromReturn) return normalizeCodigo(fromReturn[1]);
      }
    }
    return null;
  }

  function isOsEditPage(href) {
    return Boolean(String(pathnameFromHref(href)).match(OS_EDIT_PATH));
  }

  function isCaixaPage(href) {
    return Boolean(String(pathnameFromHref(href)).match(CAIXA_PATH));
  }

  function extractCaixaIdFromUrl(href) {
    const match = String(pathnameFromHref(href)).match(CAIXA_PATH);
    if (!match) return null;
    const id = String(match[1] || '').trim();
    return /^\d+$/.test(id) ? id : null;
  }

  return {
    extractCodigoOsFromUrl,
    extractCaixaIdFromUrl,
    isOsEditPage,
    isCaixaPage,
    OS_EDIT_PATH,
    CAIXA_PATH,
    OS_CODE_RE,
  };
});
