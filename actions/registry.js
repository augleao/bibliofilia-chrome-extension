/**
 * Registry de ações da extensão.
 * Novas ações (generateProtocol, printReceipt) registram-se aqui sem reescrever o core.
 */
(function (root) {
  /** @type {Map<string, { id: string, label: string, description?: string, available: boolean, run: Function }>} */
  const actions = new Map();

  function registerAction(action) {
    if (!action || !action.id || typeof action.run !== 'function') {
      throw new Error('Ação inválida: exige id e run()');
    }
    actions.set(action.id, {
      id: action.id,
      label: action.label || action.id,
      description: action.description || '',
      available: action.available !== false,
      run: action.run,
    });
    return actions.get(action.id);
  }

  function getAction(id) {
    return actions.get(id) || null;
  }

  function listActions() {
    return Array.from(actions.values()).map(({ run, ...meta }) => meta);
  }

  async function runAction(id, context = {}) {
    const action = actions.get(id);
    if (!action) {
      return { ok: false, error: `Ação desconhecida: ${id}` };
    }
    if (!action.available) {
      return { ok: false, error: `Ação indisponível: ${action.label}` };
    }
    return action.run(context);
  }

  root.BibliofiliaActions = {
    registerAction,
    getAction,
    listActions,
    runAction,
  };
})(typeof self !== 'undefined' ? self : window);
