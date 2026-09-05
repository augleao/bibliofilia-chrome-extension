/**
 * Content script: injeta FAB nas páginas do Cartosoft e dispara importOs.
 */
(function () {
  const Url = window.BibliofiliaUrl;
  const Actions = window.BibliofiliaActions;
  const Fab = window.BibliofiliaFab;

  if (!Url || !Actions || !Fab) {
    console.warn('[Bibliofilia] content deps missing');
    return;
  }

  let toastTimer = null;

  function showToast(setStatus, kind, text, ms = 4200) {
    setStatus(kind, text);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setStatus('', ''), ms);
  }

  async function handleImport({ setStatus }) {
    const codigoOs = Url.extractCodigoOsFromUrl(location.href);
    if (!codigoOs) {
      showToast(setStatus, 'error', 'Abra a tela de edição de uma OS para importar.');
      return;
    }

    showToast(setStatus, 'loading', `Importando ${codigoOs}…`, 60000);
    try {
      const result = await Actions.runAction('importOs', { codigoOs, href: location.href });
      if (result?.ok) {
        showToast(setStatus, 'success', result.message || `OS ${codigoOs} importada`);
      } else {
        showToast(setStatus, 'error', result?.error || 'Falha na importação');
      }
    } catch (err) {
      showToast(setStatus, 'error', err.message || 'Erro inesperado');
    }
  }

  function mount() {
    Fab.createFab({ onClick: handleImport });
  }

  // SPA-friendly: Cartosoft usa Angular/React — observar mudanças de URL
  let lastHref = location.href;
  mount();

  const pushState = history.pushState;
  history.pushState = function (...args) {
    const ret = pushState.apply(this, args);
    window.dispatchEvent(new Event('bibliofilia:location'));
    return ret;
  };
  const replaceState = history.replaceState;
  history.replaceState = function (...args) {
    const ret = replaceState.apply(this, args);
    window.dispatchEvent(new Event('bibliofilia:location'));
    return ret;
  };
  window.addEventListener('popstate', () => window.dispatchEvent(new Event('bibliofilia:location')));
  window.addEventListener('bibliofilia:location', () => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      mount();
    }
  });

  // Fallback poll for hash/router changes without history API hooks
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      mount();
    }
  }, 1500);

  console.log('[Bibliofilia] content script ativo', {
    codigoOs: Url.extractCodigoOsFromUrl(location.href),
  });
})();
