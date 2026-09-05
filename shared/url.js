/**
 * Extração robusta do código da OS a partir da URL do CartosoftWeb.
 * Ex.: https://cartosoftweb.recivil.com.br/cartosoft-web/ordem-de-servico/editar/AUR2600013230
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
  const OS_CODE_RE = /^[A-Za-z0-9]{6,40}$/;

  function extractCodigoOsFromUrl(href) {
    const raw = String(href || '').trim();
    if (!raw) return null;

    let pathname = '';
    try {
      // Prefer WHATWG URL when available (browser + Node)
      const BaseURL = typeof URL !== 'undefined' ? URL : null;
      if (BaseURL) {
        pathname = new BaseURL(raw, 'https://cartosoftweb.recivil.com.br').pathname || '';
      } else {
        const pathMatch = raw.match(/^https?:\/\/[^/]+(\/[^?#]*)/i);
        pathname = pathMatch ? pathMatch[1] : raw;
      }
    } catch (_) {
      const pathMatch = raw.match(/(\/ordem-de-servico\/editar\/[^?#]*)/i);
      pathname = pathMatch ? pathMatch[1] : '';
    }

    const match = String(pathname).match(OS_EDIT_PATH);
    if (!match) return null;
    let codigo = decodeURIComponent(match[1] || '').trim().toUpperCase();
    codigo = codigo.replace(/[^A-Z0-9].*$/, '');
    if (!OS_CODE_RE.test(codigo)) return null;
    return codigo;
  }

  function isOsEditPage(href) {
    return Boolean(extractCodigoOsFromUrl(href));
  }

  return {
    extractCodigoOsFromUrl,
    isOsEditPage,
    OS_EDIT_PATH,
    OS_CODE_RE,
  };
});
