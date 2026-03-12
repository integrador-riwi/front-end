const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>`
};

const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

class SileoToast {
  constructor(options = {}) {
    this.position = options.position || 'top-right';
    this.duration = options.duration || 4000;
    this.container = null;
    this.toasts = [];
    this._init();
  }

  _init() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.className = `sileo-container ${this.position}`;
    document.body.appendChild(this.container);
  }

  _createToastElement(id, type, title, message, action) {
    const toast = document.createElement('div');
    toast.className = `sileo-toast ${type}`;
    toast.dataset.id = id;

    const iconHtml = ICONS[type] || ICONS.info;
    
    let html = `
      <div class="sileo-icon">${iconHtml}</div>
      <div class="sileo-content">
        ${title ? `<div class="sileo-title">${this._escapeHtml(title)}</div>` : ''}
        ${message ? `<div class="sileo-message">${this._escapeHtml(message)}</div>` : ''}
        ${action ? `<button class="sileo-action">${this._escapeHtml(action.label)}</button>` : ''}
      </div>
      <button class="sileo-close">${CLOSE_ICON}</button>
    `;

    if (this.duration > 0) {
      html += `<div class="sileo-progress" style="animation-duration: ${this.duration}ms;"></div>`;
    }

    toast.innerHTML = html;

    const closeBtn = toast.querySelector('.sileo-close');
    closeBtn.addEventListener('click', () => this.remove(id));

    if (action?.onClick) {
      const actionBtn = toast.querySelector('.sileo-action');
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        action.onClick();
        this.remove(id);
      });
    }

    return toast;
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _generateId() {
    return 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  add(type, title, message, options = {}) {
    const id = this._generateId();
    const toastEl = this._createToastElement(id, type, title, message, options.action);
    
    this.container.appendChild(toastEl);
    this.toasts.push({ id, type, title, message });

    if (this.duration > 0) {
      setTimeout(() => this.remove(id), this.duration);
    }

    return id;
  }

  success(title, message, options) {
    return this.add('success', title, message, options);
  }

  error(title, message, options) {
    return this.add('error', title, message, options);
  }

  warning(title, message, options) {
    return this.add('warning', title, message, options);
  }

  info(title, message, options) {
    return this.add('info', title, message, options);
  }

  remove(id) {
    const toast = this.container.querySelector(`[data-id="${id}"]`);
    if (!toast) return;

    toast.classList.add('exiting');
    
    setTimeout(() => {
      toast.remove();
      this.toasts = this.toasts.filter(t => t.id !== id);
      
      if (this.toasts.length === 0) {
        this.container.remove();
        this.container = null;
      }
    }, 300);
  }

  clear() {
    const toasts = this.container?.querySelectorAll('.sileo-toast') || [];
    toasts.forEach(toast => {
      toast.classList.add('exiting');
    });
    
    setTimeout(() => {
      this.toasts = [];
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
    }, 300);
  }

  promise(promise, loadingMessage, options = {}) {
    const id = this.add('info', options.title || 'Loading', loadingMessage, {
      action: options.action
    });

    promise
      .then((data) => {
        this.remove(id);
        if (options.success) {
          const msg = typeof options.success === 'function' 
            ? options.success(data) 
            : options.success;
          this.success(options.title || 'Success', msg, options);
        }
      })
      .catch((error) => {
        this.remove(id);
        const msg = options.error 
          ? (typeof options.error === 'function' ? options.error(error) : options.error)
          : (error?.message || 'An error occurred');
        this.error(options.title || 'Error', msg, options);
      });

    return promise;
  }
}

const toast = new SileoToast({
  position: 'top-right',
  duration: 4000
});

window.toast = toast;

export default SileoToast;
export { toast, SileoToast };
