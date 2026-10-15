import { initRouter, addRoute, navigate } from './router.js';
import { refreshSession } from './auth.js';
import { renderUserStatus } from './components/userStatus.js';
import * as play from './surfaces/play.js';
import * as leaderboards from './surfaces/leaderboards.js';
import * as profile from './surfaces/profile.js';
import * as about from './surfaces/about.js';
import * as home from './surfaces/home.js';

// auth module needs a way to be reached from forms without import cycles
import * as auth from './auth.js';
window.__ppoAuth = auth;

addRoute('/', home.render);
addRoute('/play', play.render);
addRoute('/play/:id', play.render);
addRoute('/leaderboards', leaderboards.render);
addRoute('/profile', profile.render);
addRoute('/profile/:username', profile.render);
addRoute('/about', about.render);

const outlet = document.getElementById('outlet');
initRouter(outlet);
renderUserStatus(document.getElementById('user-status'));
refreshSession().then(() => {
  // profile route renders differently once auth resolves
  if (window.location.pathname === '/profile') navigate('/profile');
});
