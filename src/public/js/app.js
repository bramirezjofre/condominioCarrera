document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-mobile-menu-toggle]');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const existing = document.querySelector('[data-mobile-menu]');
      if (existing) {
        existing.remove();
        return;
      }
      const sidebar = document.querySelector('aside[aria-label="Navegacion principal"]');
      if (!sidebar) return;
      const clone = sidebar.cloneNode(true);
      clone.classList.remove('hidden', 'lg:flex');
      clone.classList.add('fixed', 'inset-0', 'z-40', 'flex', 'flex-col');
      clone.setAttribute('data-mobile-menu', '');
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-navy-900/70 z-30';
      overlay.addEventListener('click', () => {
        clone.remove();
        overlay.remove();
      });
      document.body.appendChild(overlay);
      document.body.appendChild(clone);
    });
  }

  document.querySelectorAll('[data-confirm]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const message = el.getAttribute('data-confirm');
      if (!confirm(message)) {
        e.preventDefault();
      }
    });
  });
});