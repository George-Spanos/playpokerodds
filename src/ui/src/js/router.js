// Router: History API with param matching. Routes map path → render fn.
// Each route also declares SEO metadata; the router injects it per navigation
// so crawlers and link previews see page-specific title/description/canonical.

const SITE = 'https://playpokerodds.com';

const routes = [];
let outlet = null;

function setMeta({ title, description, canonical, ogType = 'website' }) {
  document.title = title;
  setTag('meta', 'name', 'description', 'content', description);
  setTag('link', 'rel', 'canonical', 'href', `${SITE}${canonical}`);
  setTag('meta', 'property', 'og:title', 'content', title);
  setTag('meta', 'property', 'og:description', 'content', description);
  setTag('meta', 'property', 'og:url', 'content', `${SITE}${canonical}`);
  setTag('meta', 'property', 'og:type', 'content', ogType);
  setTag('meta', 'name', 'twitter:title', 'content', title);
  setTag('meta', 'name', 'twitter:description', 'content', description);
}

function setTag(tag, key, keyVal, valueAttr, value) {
  if (!value) return;
  let el = document.head.querySelector(`${tag}[${key}="${keyVal}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(key, keyVal);
    document.head.append(el);
  }
  el.setAttribute(valueAttr, value);
}

export function addRoute(pattern, render, meta) {
  // '/play/:id' → regex with named group
  const regex = new RegExp(
    '^' + pattern.replace(/:([a-zA-Z]+)/g, '(?<$1>[^/]+)') + '$'
  );
  routes.push({ pattern, regex, render, meta });
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

export function navigate(path, { keepMeta = false } = {}) {
  history.pushState(null, '', path);
  renderRoute({ keepMeta });
}

function renderRoute({ keepMeta = false } = {}) {
  if (!outlet) return;
  const path = window.location.pathname;
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      if (route.meta && !keepMeta) setMeta(route.meta);
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
    if (home.meta) setMeta(home.meta);
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
