/* Dark / Light mode toggle, persisted in localStorage */
(function () {
  const stored = localStorage.getItem('ss_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ss_theme', next);
    document.querySelectorAll('.theme-toggle .knob i').forEach((i) => {
      i.className = next === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
    });
  };
})();
