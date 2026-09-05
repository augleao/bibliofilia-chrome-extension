const MessageType = {
  GET_AUTH_STATUS: 'GET_AUTH_STATUS',
  PAIR_WITH_CODE: 'PAIR_WITH_CODE',
  DISCONNECT: 'DISCONNECT',
  SET_API_ENV: 'SET_API_ENV',
};

const apiEnv = document.getElementById('apiEnv');
const linkBadge = document.getElementById('linkBadge');
const userLine = document.getElementById('userLine');
const syncLine = document.getElementById('syncLine');
const pairSection = document.getElementById('pairSection');
const linkedSection = document.getElementById('linkedSection');
const pairCode = document.getElementById('pairCode');
const pairBtn = document.getElementById('pairBtn');
const pairMsg = document.getElementById('pairMsg');
const disconnectBtn = document.getElementById('disconnectBtn');

function send(message) {
  return chrome.runtime.sendMessage(message);
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch (_) {
    return String(value);
  }
}

function renderStatus(status) {
  apiEnv.value = status.apiEnv || 'prod';
  if (status.linked) {
    linkBadge.textContent = 'Vinculada';
    linkBadge.className = 'badge badge--on';
    const u = status.user || {};
    userLine.textContent = [u.nome, u.serventia].filter(Boolean).join(' · ') || 'Usuário vinculado';
    syncLine.textContent = status.lastSyncAt
      ? `Última sincronização: ${formatDate(status.lastSyncAt)}`
      : 'Aguardando primeira importação';
    pairSection.hidden = true;
    linkedSection.hidden = false;
  } else {
    linkBadge.textContent = status.expired ? 'Sessão expirada' : 'Não vinculada';
    linkBadge.className = 'badge badge--off';
    userLine.textContent = 'Gere um código no Admin do Bibliofilia e cole abaixo.';
    syncLine.textContent = '';
    pairSection.hidden = false;
    linkedSection.hidden = true;
  }
}

function showPairMsg(text, ok) {
  pairMsg.hidden = !text;
  pairMsg.textContent = text || '';
  pairMsg.className = `popup__msg ${ok ? 'is-ok' : 'is-error'}`;
}

async function refresh() {
  const status = await send({ type: MessageType.GET_AUTH_STATUS });
  renderStatus(status || {});
}

apiEnv.addEventListener('change', async () => {
  await send({ type: MessageType.SET_API_ENV, envId: apiEnv.value });
});

pairBtn.addEventListener('click', async () => {
  const code = String(pairCode.value || '').trim();
  if (!code) {
    showPairMsg('Informe o código de vínculo.', false);
    return;
  }
  pairBtn.disabled = true;
  showPairMsg('Vinculando…', true);
  try {
    const result = await send({ type: MessageType.PAIR_WITH_CODE, code });
    if (result?.ok) {
      showPairMsg('Extensão vinculada com sucesso.', true);
      pairCode.value = '';
      await refresh();
    } else {
      showPairMsg(result?.error || 'Falha ao vincular.', false);
    }
  } catch (err) {
    showPairMsg(err.message || 'Erro ao vincular.', false);
  } finally {
    pairBtn.disabled = false;
  }
});

disconnectBtn.addEventListener('click', async () => {
  await send({ type: MessageType.DISCONNECT });
  showPairMsg('', true);
  await refresh();
});

refresh().catch((err) => {
  userLine.textContent = err.message || 'Falha ao ler status';
});
