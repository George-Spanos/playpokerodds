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

const SITE = 'https://playpokerodds.com';
const TAGLINE = 'Forget about bets. Focus on winning chances.';

addRoute('/', home.render, {
  title: 'Play Poker Odds! — Poker Equity Trainer',
  description: `Free poker equity trainer: get dealt a hand, guess your winning chances, see the true odds. ${TAGLINE} Play instantly, no signup needed.`,
  canonical: '/',
});
addRoute('/play', play.render, {
  title: 'Play — Train Your Poker Odds Intuition | Play Poker Odds!',
  description: `Deal a poker hand, guess your winning percentage, and reveal the calculated odds. Build preflop and postflop equity intuition round by round. ${TAGLINE}`,
  canonical: '/play',
});
addRoute('/play/:id', play.render, {
  title: 'Poker Round | Play Poker Odds!',
  description: `Play this poker round: guess the winning chances and compare with the calculated odds. ${TAGLINE}`,
  canonical: '/play',
});
addRoute('/leaderboards', leaderboards.render, {
  title: 'Leaderboards — Best Guessers | Play Poker Odds!',
  description: 'See the top poker odds guessers ranked by guess accuracy. Sign in, play rounds, and climb the leaderboard.',
  canonical: '/leaderboards',
});
addRoute('/profile', profile.render, {
  title: 'Your Profile | Play Poker Odds!',
  description: 'Your poker odds training history: round-by-round guess accuracy, favorites, and running score.',
  canonical: '/profile',
});
addRoute('/profile/:username', profile.render, {
  title: 'Player Profile | Play Poker Odds!',
  description: 'Poker odds training history for this player: guess accuracy across rounds and favorites.',
  canonical: '/profile',
});
addRoute('/about', about.render, {
  title: 'About — How It Works | Play Poker Odds!',
  description: `How Play Poker Odds! works: 50,000-iteration Monte Carlo simulation scores your equity guesses. ${TAGLINE}`,
  canonical: '/about',
});

const outlet = document.getElementById('outlet');
initRouter(outlet);
renderUserStatus(document.getElementById('user-status'));
refreshSession().then(() => {
  // profile route renders differently once auth resolves
  if (window.location.pathname === '/profile') navigate('/profile');
});
