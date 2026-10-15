// Auth state: tiny observable store with session refresh.

import { register, signin, refreshToken, setToken, getToken, setUnauthorizedHandler } from './api.js';

let state = { user: null, status: 'UNAUTHORIZED', errorMessage: '' };
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

function setUser(user) {
  state = { ...state, user, status: 'AUTHORIZED', errorMessage: '' };
  emit();
}

export async function signinAction(dto) {
  const { status, body } = await signin(dto);
  if (status === 200 && body?.token) {
    setToken(body.token);
    setUser({ id: body.id, username: body.username, email: body.email, score: body.score });
    return true;
  }
  state = { ...state, errorMessage: body?.message ?? 'Sign in failed', status: 'UNAUTHORIZED' };
  emit();
  return false;
}

export async function registerAction(dto) {
  const { status, body } = await register(dto);
  if (status === 200 && body?.token) {
    setToken(body.token);
    setUser({ id: body.id, username: body.username, email: body.email, score: body.score });
    return true;
  }
  const message = typeof body === 'string' ? body : body?.message ?? 'Registration failed';
  state = { ...state, errorMessage: message, status: 'UNAUTHORIZED' };
  emit();
  return false;
}

export async function refreshSession() {
  if (!getToken()) return;
  const { status, body } = await refreshToken();
  if (status === 200 && body?.token) {
    setToken(body.token);
    setUser({ id: body.id, username: body.username, email: body.email, score: body.score });
  } else {
    setToken(null);
    state = { ...state, user: null, status: 'UNAUTHORIZED' };
    emit();
  }
}

export function logout() {
  setToken(null);
  state = { user: null, status: 'UNAUTHORIZED', errorMessage: '' };
  emit();
}

export function clearError() {
  state = { ...state, errorMessage: '' };
  emit();
}

setUnauthorizedHandler(() => {
  setToken(null);
  state = { user: null, status: 'UNAUTHORIZED', errorMessage: 'Session expired' };
  emit();
});
