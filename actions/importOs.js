/**
 * Ação: importar a OS ativa (código da URL) no Bibliofilia.
 * A chamada HTTP real acontece no service worker (background).
 */
(function (root) {
  const MessageType = root.BibliofiliaMessages?.MessageType;

  async function runImportOs(context = {}) {
    const codigoOs = context.codigoOs
      || root.BibliofiliaUrl?.extractCodigoOsFromUrl(context.href || (typeof location !== 'undefined' ? location.href : ''));

    if (!codigoOs) {
      return {
        ok: false,
        error: 'Abra uma OS em /ordem-de-servico/editar/{codigo} para importar.',
      };
    }

    // Em content script: delega ao background
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && MessageType) {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.RUN_ACTION,
        actionId: 'importOs',
        payload: {
          codigoOs,
          openProtocol: context.openProtocol !== false,
        },
      });
      return response || { ok: false, error: 'Sem resposta do background.' };
    }

    return { ok: false, error: 'Ambiente sem chrome.runtime; use o service worker.' };
  }

  if (root.BibliofiliaActions) {
    root.BibliofiliaActions.registerAction({
      id: 'importOs',
      label: 'Importar OS e gerar protocolo',
      description: 'Importa a OS do Cartosoft e abre o protocolo do pedido no Bibliofilia',
      available: true,
      run: runImportOs,
    });

    root.BibliofiliaActions.registerAction({
      id: 'generateProtocol',
      label: 'Gerar protocolo',
      description: 'Incluído na ação Prot. (importar + abrir recibo)',
      available: true,
      run: runImportOs,
    });
    root.BibliofiliaActions.registerAction({
      id: 'printReceipt',
      label: 'Imprimir recibo',
      description: 'Abra o protocolo gerado para imprimir',
      available: false,
      run: async () => ({ ok: false, error: 'Abra o protocolo gerado para imprimir o recibo.' }),
    });
  }

  root.BibliofiliaImportOs = { runImportOs };
})(typeof self !== 'undefined' ? self : window);
