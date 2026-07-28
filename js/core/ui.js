/**
 * Shared DOM/UI helpers: element creation, modals, floating toast notifications,
 * and small render helpers reused by every view module.
 */
(function (ORV) {
  'use strict';

  function createEl(tag, options) {
    var el = document.createElement(tag);
    options = options || {};
    if (options.className) el.className = options.className;
    if (options.html !== undefined) el.innerHTML = options.html;
    if (options.text !== undefined) el.textContent = options.text;
    if (options.attrs) {
      Object.keys(options.attrs).forEach(function (key) {
        el.setAttribute(key, options.attrs[key]);
      });
    }
    if (options.onClick) el.addEventListener('click', options.onClick);
    return el;
  }

  function icon(name, className) {
    var base = window.ORV_BASE_PATH || '';
    return '<svg class="icon ' + (className || '') + '"><use href="' + base + 'assets/icons/sprite.svg#' + name + '"></use></svg>';
  }

  /** Renders an uploaded image if present, otherwise falls back to a placeholder icon. Used everywhere an entity can have staff-uploaded art. */
  function mediaHtml(imageUrl, iconName, className) {
    if (imageUrl) {
      return '<img class="' + (className || '') + '" src="' + imageUrl + '" alt="">';
    }
    return icon(iconName || 'icon-book', className);
  }

  /* ---------------- Toasts ---------------- */

  function getToastStack() {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = createEl('div', { className: 'toast-stack' });
      document.body.appendChild(stack);
    }
    return stack;
  }

  function notify(message, type) {
    type = type || 'info';
    var stack = getToastStack();
    var toast = createEl('div', {
      className: 'toast toast-' + type,
      html: ORV.Utils.escapeHtml(message)
    });
    stack.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('is-leaving');
      setTimeout(function () { toast.remove(); }, 220);
    }, 3600);
  }

  /* ---------------- Modal ---------------- */

  function openModal(options) {
    closeModal();
    var overlay = createEl('div', { className: 'modal-overlay', attrs: { 'data-role': 'modal-overlay' } });
    var modal = createEl('div', { className: 'modal' });

    var header = createEl('div', { className: 'modal__header' });
    header.appendChild(createEl('h2', { text: options.title || '', attrs: { style: 'margin:0' } }));
    var closeBtn = createEl('button', { className: 'modal__close', html: '&times;', attrs: { 'aria-label': 'Close' } });
    closeBtn.addEventListener('click', closeModal);
    header.appendChild(closeBtn);

    var body = createEl('div', { className: 'modal__body' });
    if (typeof options.content === 'string') {
      body.innerHTML = options.content;
    } else if (options.content instanceof HTMLElement) {
      body.appendChild(options.content);
    }

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);

    overlay.addEventListener('click', function (evt) {
      if (evt.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
    if (options.onOpen) options.onOpen(body);
    return body;
  }

  function closeModal() {
    var existing = document.querySelector('[data-role="modal-overlay"]');
    if (existing) existing.remove();
  }

  /* ---------------- Resource bar ---------------- */

  function resourceBarHtml(label, current, max, modifierClass) {
    var pct = max > 0 ? ORV.Utils.clamp((current / max) * 100, 0, 100) : 0;
    return (
      '<div class="resource-row"><span>' + ORV.Utils.escapeHtml(label) + '</span>' +
      '<span>' + current + ' / ' + max + '</span></div>' +
      '<div class="stat-bar"><div class="stat-bar__fill ' + modifierClass + '" style="width:' + pct + '%"></div></div>'
    );
  }

  /* ---------------- Boot loader ---------------- */

  function showBootLoader(label) {
    var loader = document.querySelector('.boot-loader');
    if (!loader) {
      loader = createEl('div', { className: 'boot-loader' });
      loader.appendChild(createEl('div', { className: 'boot-loader__ring' }));
      loader.appendChild(createEl('div', { className: 'boot-loader__label', text: label || 'Opening System Window' }));
      document.body.appendChild(loader);
    }
    loader.classList.remove('is-hidden');
    return loader;
  }

  function hideBootLoader() {
    var loader = document.querySelector('.boot-loader');
    if (loader) {
      loader.classList.add('is-hidden');
      setTimeout(function () { loader.remove(); }, 650);
    }
  }

  ORV.UI = {
    createEl: createEl,
    icon: icon,
    notify: notify,
    openModal: openModal,
    closeModal: closeModal,
    resourceBarHtml: resourceBarHtml,
    showBootLoader: showBootLoader,
    hideBootLoader: hideBootLoader
  };

})(window.ORV = window.ORV || {});
