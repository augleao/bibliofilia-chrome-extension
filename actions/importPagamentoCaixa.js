/**
 * Ação: importar pagamento do caixa Cartosoft para valores adiantados no Bibliofilia.
 */
(function (root) {
  const MessageType = root.BibliofiliaMessages?.MessageType;

  async function runImportPagamentoCaixa(context = {}) {
    const caixa = context.caixa || null;
    const codigoOs = context.codigoOs
      || root.BibliofiliaUrl?.extractCodigoOsFromUrl(context.href || (typeof location !== 'undefined' ? location.href : ''))
      || (caixa && (caixa.protocoloSolicitacao || caixa.protocolo));

    if (!caixa || typeof caixa !== 'object') {
      return {
        ok: false,
        error: 'Salve o lançamento de caixa no Cartosoft antes de importar o pagamento.',
      };
    }
    if (!Array.isArray(caixa.pagamentos) || !caixa.pagamentos.length) {
      return {
        ok: false,
        error: 'O lançamento de caixa não contém pagamentos para importar.',
      };
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && MessageType) {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.RUN_ACTION,
        actionId: 'importPagamentoCaixa',
        payload: {
          codigoOs,
          caixa,
        },
      });
      return response || { ok: false, error: 'Sem resposta do background.' };
    }

    return { ok: false, error: 'Ambiente sem chrome.runtime; use o service worker.' };
  }

  if (root.BibliofiliaActions) {
    root.BibliofiliaActions.registerAction({
      id: 'importPagamentoCaixa',
      label: 'Importar pagamento do caixa',
      description: 'Envia os pagamentos do lançamento de caixa para valores adiantados do pedido',
      available: true,
      run: runImportPagamentoCaixa,
    });
  }

  root.BibliofiliaImportPagamentoCaixa = { runImportPagamentoCaixa };
})(typeof self !== 'undefined' ? self : window);
