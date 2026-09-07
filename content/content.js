/**
 * Content script: injeta FAB nas páginas do Cartosoft.
 * - OS edit: Prot. (importa OS + protocolo)
 * - cadastrar-caixa: Pag. (importa pagamento → valores adiantados)
 */
(function () {
  const Url = window.BibliofiliaUrl;
  const Actions = window.BibliofiliaActions;
  const Fab = window.BibliofiliaFab;
  const CaixaHook = window.BibliofiliaCaixaHook;

  if (!Fab) {
    console.warn('[Bibliofilia] FAB module missing — content scripts fora de ordem?');
    return;
  }

  let toastTimer = null;
  let lastSyncedFingerprint = null;
  let syncInFlight = false;
  let modalObserver = null;

  function showToast(setStatus, kind, text, ms = 4200) {
    if (typeof setStatus !== 'function') return;
    setStatus(kind, text);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setStatus('', ''), ms);
  }

  function getFabSetStatus() {
    const host = document.getElementById('bibliofilia-fab-host');
    return host && typeof host.setStatus === 'function' ? host.setStatus.bind(host) : null;
  }

  function fingerprintCaixa(caixa) {
    if (!caixa || typeof caixa !== 'object') return null;
    const pags = Array.isArray(caixa.pagamentos) ? caixa.pagamentos : [];
    return [
      caixa.id,
      caixa.protocoloSolicitacao,
      caixa.situacao,
      pags.map((p) => `${p.formaPagamento}:${p.valor}`).join(';'),
    ].join('|');
  }

  async function syncPagamento(caixa, { setStatus, manual = false } = {}) {
    if (!caixa) {
      showToast(setStatus || getFabSetStatus(), 'error', 'Nenhum lançamento de caixa capturado ainda.');
      return;
    }
    const fp = fingerprintCaixa(caixa);
    if (!manual && fp && fp === lastSyncedFingerprint) return;
    if (syncInFlight) return;
    syncInFlight = true;

    const codigoOs = Url?.extractCodigoOsFromUrl?.(location.href)
      || caixa.protocoloSolicitacao
      || null;

    showToast(
      setStatus || getFabSetStatus(),
      'loading',
      `Importando pagamento${codigoOs ? ` ${codigoOs}` : ''}…`,
      60000,
    );

    try {
      const result = await Actions.runAction('importPagamentoCaixa', {
        codigoOs,
        caixa,
        href: location.href,
      });
      if (result?.ok) {
        lastSyncedFingerprint = fp;
        const total = result.valorAdiantado != null
          ? Number(result.valorAdiantado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : null;
        showToast(
          setStatus || getFabSetStatus(),
          'success',
          result.message
            || `Pagamento importado${result.protocolo ? ` · ${result.protocolo}` : ''}${total != null ? ` · R$ ${total}` : ''}`,
        );
        markModalImported();
      } else {
        showToast(setStatus || getFabSetStatus(), 'error', result?.error || 'Falha ao importar pagamento');
      }
    } catch (err) {
      showToast(setStatus || getFabSetStatus(), 'error', err.message || 'Erro inesperado');
    } finally {
      syncInFlight = false;
    }
  }

  async function handleImportOs({ setStatus }) {
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

  async function handleImportPagamento({ setStatus }) {
    const payload = CaixaHook?.getLastPayload?.();
    const caixa = payload?.caixa || null;
    if (!caixa) {
      showToast(
        setStatus,
        'error',
        'Salve o lançamento de caixa (com pagamento) e tente novamente.',
      );
      return;
    }
    await syncPagamento(caixa, { setStatus, manual: true });
  }

  function findSuccessModal() {
    const nodes = Array.from(document.querySelectorAll('div, section, article'));
    return nodes.find((el) => {
      const text = (el.textContent || '').replace(/\s+/g, ' ');
      if (!/Lançamento de Caixa salvo com sucesso/i.test(text)) return false;
      if (!/o que deseja fazer agora/i.test(text)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 200 && rect.width < 900 && rect.height > 80 && rect.height < 500;
    }) || null;
  }

  function markModalImported() {
    const btn = document.getElementById('bibliofilia-import-pag-btn');
    if (btn) {
      btn.textContent = '✓ Importado no Bibliofilia';
      btn.disabled = true;
    }
  }

  function injectModalButton(modal) {
    if (!modal || document.getElementById('bibliofilia-import-pag-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'bibliofilia-import-pag-btn';
    btn.type = 'button';
    btn.textContent = 'Importar Bibliofilia';
    btn.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'margin-top:12px',
      'width:100%',
      'padding:10px 16px',
      'border:0',
      'border-radius:6px',
      'background:#0f3d2e',
      'color:#f4f7f5',
      'font-weight:700',
      'font-size:14px',
      'cursor:pointer',
    ].join(';');
    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const payload = CaixaHook?.getLastPayload?.();
      await syncPagamento(payload?.caixa, { setStatus: getFabSetStatus(), manual: true });
    });

    const actions = modal.querySelector('div:last-child') || modal;
    actions.appendChild(btn);
  }

  function watchSuccessModal() {
    if (modalObserver) return;
    const tick = () => {
      if (!Url?.isCaixaPage?.(location.href)) return;
      const modal = findSuccessModal();
      if (modal) injectModalButton(modal);
    };
    modalObserver = new MutationObserver(tick);
    modalObserver.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
    tick();
  }

  function shouldMountInThisFrame() {
    if (window === window.top) return true;
    return Boolean(
      Url?.isOsEditPage?.(location.href) || Url?.isCaixaPage?.(location.href)
    );
  }

  function mount() {
    if (!shouldMountInThisFrame()) return;
    try {
      const onCaixa = Boolean(Url?.isCaixaPage?.(location.href));
      Fab.createFab({
        label: onCaixa ? 'Pag.' : 'Prot.',
        onClick: onCaixa ? handleImportPagamento : handleImportOs,
      });
      if (onCaixa) {
        CaixaHook?.installPageHook?.();
        watchSuccessModal();
      }
    } catch (err) {
      console.error('[Bibliofilia] falha ao montar FAB', err);
    }
  }

  function scheduleMount() {
    mount();
    setTimeout(mount, 300);
    setTimeout(mount, 1000);
    setTimeout(mount, 2500);
  }

  if (CaixaHook?.onMessage) {
    CaixaHook.onMessage((payload) => {
      if (!payload?.caixa) return;
      CaixaHook.setLastPayload?.(payload);
      // Auto-import após salvar o caixa com sucesso
      syncPagamento(payload.caixa, { setStatus: getFabSetStatus(), manual: false });
    });
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
    caixa: Boolean(Url?.isCaixaPage?.(location.href)),
    frame: window === window.top ? 'top' : 'iframe',
    willMount: shouldMountInThisFrame(),
  });
})();
