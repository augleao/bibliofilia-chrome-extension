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
const updateCard = document.getElementById('updateCard');
const versionBadge = document.getElementById('versionBadge');
const updateLine = document.getElementById('updateLine');
const updateLink = document.getElementById('updateLink');
const localVersionLine = document.getElementById('localVersionLine');

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

function parseVersion(v) {
  return String(v || '0')
    .split('.')
    .map((p) => Number.parseInt(p, 10) || 0);
}

function isNewerVersion(remote, local) {
  const a = parseVersion(remote);
  const b = parseVersion(local);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
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

async function getLocalVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    return manifest?.version || '0';
  } catch (_) {
    return '0';
  }
}

async function checkForUpdates(status) {
  const localVersion = await getLocalVersion();
  localVersionLine.textContent = `Versão local ${localVersion}. `;
  updateCard.hidden = false;

  const envId = status?.apiEnv || apiEnv.value || 'prod';
  const cfg = typeof window !== 'undefined' ? window.BibliofiliaConfig : null;
  const env = (cfg && cfg.getEnvironment(envId)) || {
    apiBase: 'https://backend-goby.onrender.com/api',
  };

  try {
    const res = await fetch(`${env.apiBase}/chrome-extension/meta`);
    if (!res.ok) throw new Error(`meta HTTP ${res.status}`);
    const meta = await res.json();
    const remoteVersion = meta.version || '?';
    const newer = isNewerVersion(remoteVersion, localVersion);

    if (newer) {
      versionBadge.textContent = `v${remoteVersion}`;
      versionBadge.className = 'badge badge--warn';
      updateLine.textContent = `Nova versão disponível (você tem ${localVersion}). Instalações via CRX/política atualizam sozinhas; unpacked precisa recarregar o pacote.`;
      if (meta.crxAvailable) {
        updateLink.hidden = false;
        updateLink.href = `${env.apiBase}/chrome-extension/download.crx`;
        updateLink.textContent = 'Baixar .crx';
      } else if (meta.packageAvailable) {
        updateLink.hidden = false;
        updateLink.href = `${env.apiBase}/chrome-extension/download`;
        updateLink.textContent = 'Baixar .zip (login necessário)';
      } else {
        updateLink.hidden = true;
      }
    } else {
      versionBadge.textContent = `v${localVersion}`;
      versionBadge.className = 'badge badge--on';
      updateLine.textContent = 'Você está na versão mais recente deste ambiente.';
      updateLink.hidden = true;
    }
  } catch (err) {
    versionBadge.textContent = `v${localVersion}`;
    versionBadge.className = 'badge badge--off';
    updateLine.textContent = `Não foi possível checar atualizações (${err.message || 'erro'}).`;
    updateLink.hidden = true;
  }
}

async function refresh() {
  const status = await send({ type: MessageType.GET_AUTH_STATUS });
  renderStatus(status || {});
  await checkForUpdates(status || {});
}

apiEnv.addEventListener('change', async () => {
  await send({ type: MessageType.SET_API_ENV, envId: apiEnv.value });
  await checkForUpdates({ apiEnv: apiEnv.value });
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
