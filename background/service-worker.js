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
import { setApiEnv, getFrontendBase } from './config-sw.js';

function buildReciboUrl(frontendBase, protocolo, formato) {
  const base = String(frontendBase || '').replace(/\/$/, '');
  const proto = encodeURIComponent(String(protocolo || '').trim());
  const fmt = String(formato || 'a4').toLowerCase() === 'termico' ? 'termico' : 'a4';
  return `${base}/#/recibo/${proto}?formato=${fmt}`;
}

const ACTION_HANDLERS = {
  async importOs(payload = {}) {
    const codigoOs = String(payload.codigoOs || '').trim().toUpperCase();
    if (!codigoOs) {
      return { ok: false, error: 'Código da OS ausente.' };
    }
    try {
      const data = await importOsByCodigo(codigoOs);
      const summary = data?.summary || {};
      const protocolo = String(
        summary?.pedido?.protocolo
        || summary?.protocolo
        || data?.protocolo
        || codigoOs
      ).trim();
      const formato = String(data?.protocoloFormato || summary?.protocoloFormato || 'a4').toLowerCase();
      const frontendBase = await getFrontendBase();
      const reciboUrl = buildReciboUrl(frontendBase, protocolo, formato);

      if (payload.openProtocol !== false && protocolo) {
        try {
          await chrome.tabs.create({ url: reciboUrl, active: true });
        } catch (err) {
          console.warn('[Bibliofilia] não foi possível abrir o protocolo:', err?.message || err);
        }
      }

      return {
        ok: true,
        codigoOs,
        protocolo,
        protocoloFormato: formato,
        reciboUrl,
        message: `OS ${codigoOs} importada` +
          (summary.pedidosCreated ? ' e protocolo gerado' : summary.pedidosLinked ? ' (já vinculada)' : '') +
          ` · abrindo recibo`,
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
  async generateProtocol() {
    return { ok: false, error: 'Use o botão Prot. na OS para importar e abrir o protocolo.' };
  },
  async printReceipt() {
    return { ok: false, error: 'Abra o protocolo gerado para imprimir o recibo.' };
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
