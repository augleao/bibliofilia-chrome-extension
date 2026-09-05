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
        payload: { codigoOs },
      });
      return response || { ok: false, error: 'Sem resposta do background.' };
    }

    return { ok: false, error: 'Ambiente sem chrome.runtime; use o service worker.' };
  }

  if (root.BibliofiliaActions) {
    root.BibliofiliaActions.registerAction({
      id: 'importOs',
      label: 'Importar OS',
      description: 'Importa a Ordem de Serviço aberta no Cartosoft para o Bibliofilia',
      available: true,
      run: runImportOs,
    });

    // Slots futuros (ainda indisponíveis)
    root.BibliofiliaActions.registerAction({
      id: 'generateProtocol',
      label: 'Gerar protocolo',
      description: 'Gera protocolo no Bibliofilia (em breve)',
      available: false,
      run: async () => ({ ok: false, error: 'Em breve' }),
    });
    root.BibliofiliaActions.registerAction({
      id: 'printReceipt',
      label: 'Imprimir recibo',
      description: 'Imprime recibo da OS (em breve)',
      available: false,
      run: async () => ({ ok: false, error: 'Em breve' }),
    });
  }

  root.BibliofiliaImportOs = { runImportOs };
})(typeof self !== 'undefined' ? self : window);
