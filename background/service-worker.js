/**
 * Service worker MV3 — auth, API e dispatch de ações.
 */
import { MessageType } from './messages-sw.js';
import {
  exchangePairingCode,
  disconnect,
  getAuthStatus,
  importOsByCodigo,
} from './api.js';
import { setApiEnv } from './config-sw.js';

const ACTION_HANDLERS = {
  async importOs(payload = {}) {
    const codigoOs = String(payload.codigoOs || '').trim().toUpperCase();
    if (!codigoOs) {
      return { ok: false, error: 'Código da OS ausente.' };
    }
    try {
      const data = await importOsByCodigo(codigoOs);
      const summary = data?.summary || {};
      return {
        ok: true,
        codigoOs,
        message: `OS ${codigoOs} importada` +
          (summary.pedidosCreated ? ' (pedido criado)' : summary.pedidosLinked ? ' (já vinculada)' : ''),
        summary,
        data,
      };
    } catch (err) {
      return {
        ok: false,
        codigoOs,
        error: err.message || 'Falha ao importar OS',
        code: err.code || null,
      };
    }
  },
  // Slots futuros
  async generateProtocol() {
    return { ok: false, error: 'Gerar protocolo: em breve' };
  },
  async printReceipt() {
    return { ok: false, error: 'Imprimir recibo: em breve' };
  },
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((err) => {
    sendResponse({ ok: false, error: err.message || 'Erro interno' });
  });
  return true; // async
});

async function handleMessage(message) {
  const type = message?.type;
  switch (type) {
    case MessageType.PING:
      return { ok: true, pong: true };
    case MessageType.GET_AUTH_STATUS:
      return { type: MessageType.AUTH_STATUS, ...(await getAuthStatus()) };
    case MessageType.PAIR_WITH_CODE: {
      try {
        const data = await exchangePairingCode(message.code);
        return {
          type: MessageType.PAIR_RESULT,
          ok: true,
          user: data.user,
          expiresAt: data.expiresAt,
        };
      } catch (err) {
        return {
          type: MessageType.PAIR_RESULT,
          ok: false,
          error: err.message || 'Falha no vínculo',
        };
      }
    }
    case MessageType.DISCONNECT: {
      await disconnect();
      return { ok: true };
    }
    case MessageType.SET_API_ENV: {
      const env = await setApiEnv(message.envId);
      return { ok: true, env };
    }
    case MessageType.RUN_ACTION: {
      const handler = ACTION_HANDLERS[message.actionId];
      if (!handler) {
        return { ok: false, error: `Ação desconhecida: ${message.actionId}` };
      }
      return handler(message.payload || {});
    }
    default:
      return { ok: false, error: `Mensagem desconhecida: ${type}` };
  }
}

console.log('[Bibliofilia] service worker ativo');
