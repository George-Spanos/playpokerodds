// API client: fetch wrapper with bearer token attach + refresh-on-401.

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : '';

const TOKEN_KEY = 'ppo_bearer_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token === null) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(method, path, { token = getToken(), body } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && onUnauthorized) onUnauthorized();
  return res;
}

async function jsonRequest(method, path, opts) {
  const res = await request(method, path, opts);
  if (res.status === 204 || res.status === 304) return { status: res.status, body: null };
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ---- game ----

export function fetchRound({ boardState, totalHands, totalKnownHands }) {
  const qs = new URLSearchParams({ boardState, totalHands, totalKnownHands });
  return jsonRequest('GET', `/poker/fetchRound?${qs}`);
}

export function fetchRandomRound() {
  return jsonRequest('GET', '/poker/fetchRandomRound');
}

export function fetchRoundById(id) {
  return jsonRequest('GET', `/poker/fetchRoundById/${id}`);
}

export function postNewRoundAnswer(round, estimate) {
  return jsonRequest('POST', '/poker/postNewRoundAnswer', { body: { round, estimate } });
}

export function postExistingRoundAnswer(roundId, estimate) {
  return jsonRequest('POST', '/poker/postExistingRoundAnswer', { body: { roundId, estimate } });
}

export function addToFavorites(roundId) {
  return jsonRequest('PUT', `/poker/addToFavorites/${roundId}`);
}

export function removeFromFavorites(roundId) {
  return jsonRequest('PUT', `/poker/removeFromFavorites/${roundId}`);
}

export function fetchLeaderboards() {
  return jsonRequest('GET', '/poker/fetchLeaderboards');
}

// ---- auth ----

export function register(dto) {
  return jsonRequest('POST', '/auth/register', { body: dto, token: null });
}

export function signin(dto) {
  return jsonRequest('POST', '/auth/login', { body: dto, token: null });
}

export function refreshToken() {
  return jsonRequest('GET', '/auth/refreshToken');
}

// ---- user ----

export function fetchUserProfile(username) {
  return jsonRequest('GET', `/user/fetchByUsername/${username}`);
}

export function updateUser(dto) {
  return jsonRequest('PUT', '/user/update', { body: dto });
}
