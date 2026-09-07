/**
 * FAB arrastável com posição persistida em chrome.storage.local.
 * Usa Shadow DOM + estilos !important para não ser escondido pelo CSS do Cartosoft.
 */
(function (root) {
  const HOST_ID = 'bibliofilia-fab-host';
  const STORAGE_KEY =
    (root.BibliofiliaConfig && root.BibliofiliaConfig.STORAGE_KEYS.fabPosition) || 'fabPosition';

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function setImportant(el, styles) {
    Object.keys(styles).forEach((key) => {
      el.style.setProperty(key, styles[key], 'important');
    });
  }

  async function loadPosition() {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      return data[STORAGE_KEY] || null;
    } catch (_) {
      return null;
    }
  }

  async function savePosition(pos) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: pos });
    } catch (_) {
      // ignore
    }
  }

  const FAB_SIZE = 64;

  function applyHostShellStyle(host) {
    setImportant(host, {
      position: 'fixed',
      'z-index': '2147483647',
      right: '16px',
      bottom: '24px',
      left: 'auto',
      top: 'auto',
      width: `${FAB_SIZE}px`,
      height: `${FAB_SIZE}px`,
      margin: '0',
      padding: '0',
      border: '0',
      background: 'transparent',
      'pointer-events': 'none',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      overflow: 'visible',
      transform: 'none',
      'clip-path': 'none',
      filter: 'none',
    });
  }

  function ensureParent(host) {
    const parent = document.body || document.documentElement;
    if (!parent) return false;
    if (host.parentNode !== parent) parent.appendChild(host);
    return true;
  }

  function createFab({ onClick, onStatus, label = 'Prot.', title } = {}) {
    const existing = document.getElementById(HOST_ID);
    if (existing) {
      applyHostShellStyle(existing);
      ensureParent(existing);
      if (existing._biblioBtn) {
        existing._biblioBtn.textContent = label;
        const tip = title
          || (label === 'Pag.'
            ? 'Importar pagamento do caixa para valores adiantados no Bibliofilia.'
            : 'Importe a OS para o Bibliofilia e gere o protocolo do pedido.');
        existing._biblioBtn.title = tip;
        existing._biblioBtn.setAttribute('aria-label', tip);
      }
      if (typeof onClick === 'function') existing._biblioOnClick = onClick;
      return existing;
    }

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('data-bibliofilia', 'fab');
    applyHostShellStyle(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      .wrap {
        position: relative;
        width: ${FAB_SIZE}px;
        height: ${FAB_SIZE}px;
        pointer-events: none;
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      .fab {
        pointer-events: auto;
        width: ${FAB_SIZE}px;
        height: ${FAB_SIZE}px;
        border: 0;
        border-radius: 50%;
        background: linear-gradient(145deg, #0f3d2e 0%, #1a6b4a 55%, #0b2a1f 100%);
        color: #f4f7f5;
        box-shadow: 0 8px 24px rgba(11, 42, 31, 0.45);
        cursor: grab;
        display: grid;
        place-items: center;
        font-weight: 800;
        font-size: 13px;
        letter-spacing: 0.02em;
        line-height: 1;
        padding: 0;
      }
      .fab.is-loading { background: linear-gradient(145deg, #334155, #64748b); }
      .fab.is-success { background: linear-gradient(145deg, #166534, #22c55e); }
      .fab.is-error { background: linear-gradient(145deg, #7f1d1d, #dc2626); }
      .toast {
        pointer-events: none;
        position: absolute;
        right: 0;
        bottom: calc(100% + 10px);
        min-width: 200px;
        max-width: 280px;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.92);
        color: #f8fafc;
        font-size: 12px;
        line-height: 1.35;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
      }
      .toast[hidden] { display: none !important; }
    `;

    const wrap = document.createElement('div');
    wrap.className = 'wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fab';
    const tip = title
      || (label === 'Pag.'
        ? 'Importar pagamento do caixa para valores adiantados no Bibliofilia.'
        : 'Importe a OS para o Bibliofilia e gere o protocolo do pedido.');
    btn.setAttribute('aria-label', tip);
    btn.title = tip;
    btn.textContent = label;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.hidden = true;

    wrap.appendChild(btn);
    wrap.appendChild(toast);
    shadow.appendChild(style);
    shadow.appendChild(wrap);

    if (!ensureParent(host)) {
      console.warn('[Bibliofilia] FAB: document ainda sem body/html');
      return null;
    }

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;

    function setStatus(kind, text) {
      host.dataset.status = kind || '';
      btn.classList.toggle('is-loading', kind === 'loading');
      btn.classList.toggle('is-success', kind === 'success');
      btn.classList.toggle('is-error', kind === 'error');
      if (text) {
        toast.hidden = false;
        toast.textContent = text;
        toast.dataset.kind = kind || '';
      } else {
        toast.hidden = true;
        toast.textContent = '';
      }
      if (typeof onStatus === 'function') onStatus(kind, text);
    }

    function applyPosition(pos) {
      const margin = 12;
      const w = FAB_SIZE;
      const h = FAB_SIZE;
      const left = clamp(Number(pos.left) || 0, margin, window.innerWidth - w - margin);
      const top = clamp(Number(pos.top) || 0, margin, window.innerHeight - h - margin);
      setImportant(host, {
        left: `${left}px`,
        top: `${top}px`,
        right: 'auto',
        bottom: 'auto',
      });
      return { left, top };
    }

    loadPosition().then((pos) => {
      if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
        applyPosition(pos);
      } else {
        applyPosition({
          left: window.innerWidth - 72,
          top: window.innerHeight - 96,
        });
      }
    });

    btn.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      dragging = true;
      moved = false;
      startX = ev.clientX;
      startY = ev.clientY;
      const rect = host.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      btn.setPointerCapture(ev.pointerId);
    });

    btn.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      applyPosition({ left: originLeft + dx, top: originTop + dy });
    });

    btn.addEventListener('pointerup', async (ev) => {
      if (!dragging) return;
      dragging = false;
      try {
        btn.releasePointerCapture(ev.pointerId);
      } catch (_) {
        // ignore
      }
      const rect = host.getBoundingClientRect();
      await savePosition({ left: rect.left, top: rect.top });
      const clickHandler = host._biblioOnClick || onClick;
      if (!moved && typeof clickHandler === 'function') {
        clickHandler({ setStatus });
      }
    });

    window.addEventListener('resize', () => {
      const rect = host.getBoundingClientRect();
      applyPosition({ left: rect.left, top: rect.top });
    });

    host.setStatus = setStatus;
    host._biblioBtn = btn;
    host._biblioOnClick = onClick;
    console.log('[Bibliofilia] FAB montado', {
      href: location.href,
      frame: window === window.top ? 'top' : 'iframe',
      label,
    });
    return host;
  }

  root.BibliofiliaFab = { createFab };
})(typeof self !== 'undefined' ? self : window);
