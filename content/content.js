/**
 * Content script: injeta FAB nas páginas do Cartosoft e dispara importOs.
 */
(function () {
  const Url = window.BibliofiliaUrl;
  const Actions = window.BibliofiliaActions;
  const Fab = window.BibliofiliaFab;

  if (!Fab) {
    console.warn('[Bibliofilia] FAB module missing — content scripts fora de ordem?');
    return;
  }
  if (!Url || !Actions) {
    console.warn('[Bibliofilia] deps parciais', {
      hasUrl: Boolean(Url),
      hasActions: Boolean(Actions),
    });
  }

  let toastTimer = null;

  function showToast(setStatus, kind, text, ms = 4200) {
    setStatus(kind, text);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setStatus('', ''), ms);
  }

  async function handleImport({ setStatus }) {
    const codigoOs = Url?.extractCodigoOsFromUrl?.(location.href) || null;
    if (!codigoOs) {
      showToast(
        setStatus,
        'error',
        'Abra a tela de edição de uma OS (/ordem-de-servico/editar/…).',
      );
      return;
    }

    if (!Actions?.runAction) {
      showToast(setStatus, 'error', 'Ação de importação indisponível. Recarregue a extensão.');
      return;
    }

    showToast(setStatus, 'loading', `Importando ${codigoOs} e gerando protocolo…`, 60000);
    try {
      const result = await Actions.runAction('importOs', { codigoOs, href: location.href, openProtocol: true });
      if (result?.ok) {
        const protocolo = result.protocolo || result.summary?.pedido?.protocolo || result.summary?.protocolo || codigoOs;
        showToast(
          setStatus,
          'success',
          result.message || `OS ${codigoOs} importada · protocolo ${protocolo}`,
        );
      } else {
        showToast(setStatus, 'error', result?.error || 'Falha na importação');
      }
    } catch (err) {
      showToast(setStatus, 'error', err.message || 'Erro inesperado');
    }
  }

  /** Evita dezenas de FABs em iframes irrelevantes; monta no top ou no frame da OS. */
  function shouldMountInThisFrame() {
    if (window === window.top) return true;
    return Boolean(Url?.isOsEditPage?.(location.href));
  }

  function mount() {
    if (!shouldMountInThisFrame()) return;
    try {
      Fab.createFab({ onClick: handleImport });
    } catch (err) {
      console.error('[Bibliofilia] falha ao montar FAB', err);
    }
  }

  function scheduleMount() {
    mount();
    // Cartosoft (Angular) pode montar o body depois do document_idle
    setTimeout(mount, 300);
    setTimeout(mount, 1000);
    setTimeout(mount, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMount, { once: true });
  } else {
    scheduleMount();
  }

  let lastHref = location.href;

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

  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      mount();
    }
    if (shouldMountInThisFrame() && !document.getElementById('bibliofilia-fab-host')) {
      mount();
    }
  }, 2000);

  console.log('[Bibliofilia] content script ativo', {
    href: location.href,
    codigoOs: Url?.extractCodigoOsFromUrl?.(location.href) || null,
    frame: window === window.top ? 'top' : 'iframe',
    willMount: shouldMountInThisFrame(),
  });
})();
