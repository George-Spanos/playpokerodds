// Router: History API with param matching. Routes map path → render fn.

const routes = [];
let outlet = null;

export function addRoute(pattern, render) {
  // '/play/:id' → regex with named group
  const regex = new RegExp(
    '^' + pattern.replace(/:([a-zA-Z]+)/g, '(?<$1>[^/]+)') + '$'
  );
  routes.push({ pattern, regex, render });
}

export function initRouter(outletEl) {
  outlet = outletEl;
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute('href'));
  });
  window.addEventListener('popstate', renderRoute);
  renderRoute();
}

export function navigate(path) {
  history.pushState(null, '', path);
  renderRoute();
}

function renderRoute() {
  if (!outlet) return;
  const path = window.location.pathname;
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      outlet.innerHTML = '';
      route.render(outlet, match.groups ?? {});
      updateNav(path);
      return;
    }
  }
  // catch-all → home
  history.replaceState(null, '', '/');
  const home = routes.find((r) => r.pattern === '/');
  if (home) {
    outlet.innerHTML = '';
    home.render(outlet, {});
    updateNav('/');
  }
}

function updateNav(path) {
  for (const a of document.querySelectorAll('.chalk-nav a[data-link]')) {
    const href = a.getAttribute('href');
    const active = href === '/' ? path === '/' : path.startsWith(href);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}
