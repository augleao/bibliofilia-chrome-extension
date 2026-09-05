/**
 * FAB arrastável com posição persistida em chrome.storage.local.
 */
(function (root) {
  const HOST_ID = 'bibliofilia-fab-host';
  const STORAGE_KEY = (root.BibliofiliaConfig && root.BibliofiliaConfig.STORAGE_KEYS.fabPosition) || 'fabPosition';

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
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

  function createFab({ onClick, onStatus } = {}) {
    if (document.getElementById(HOST_ID)) {
      return document.getElementById(HOST_ID);
    }

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('data-bibliofilia', 'fab');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bibliofilia-fab';
    btn.setAttribute('aria-label', 'Bibliofilia — Importar OS');
    btn.title = 'Importar OS no Bibliofilia';
    btn.innerHTML = '<span class="bibliofilia-fab__glyph">B</span>';

    const toast = document.createElement('div');
    toast.className = 'bibliofilia-fab-toast';
    toast.hidden = true;

    host.appendChild(btn);
    host.appendChild(toast);
    document.documentElement.appendChild(host);

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
      const w = btn.offsetWidth || 56;
      const h = btn.offsetHeight || 56;
      const left = clamp(pos.left, margin, window.innerWidth - w - margin);
      const top = clamp(pos.top, margin, window.innerHeight - h - margin);
      host.style.left = `${left}px`;
      host.style.top = `${top}px`;
      host.style.right = 'auto';
      host.style.bottom = 'auto';
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
      host.classList.add('is-dragging');
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
      host.classList.remove('is-dragging');
      try {
        btn.releasePointerCapture(ev.pointerId);
      } catch (_) {
        // ignore
      }
      const rect = host.getBoundingClientRect();
      await savePosition({ left: rect.left, top: rect.top });
      if (!moved && typeof onClick === 'function') {
        onClick({ setStatus });
      }
    });

    window.addEventListener('resize', () => {
      const rect = host.getBoundingClientRect();
      applyPosition({ left: rect.left, top: rect.top });
    });

    host.setStatus = setStatus;
    return host;
  }

  root.BibliofiliaFab = { createFab };
})(typeof self !== 'undefined' ? self : window);
