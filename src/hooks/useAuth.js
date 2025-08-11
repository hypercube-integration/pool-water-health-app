// src/hooks/useAuth.js
import { useEffect, useState } from 'react';

const LS_KEY = 'pool-auth:principal-v1';

let cachedUser = loadLS();
let authLoadingGlobal = !cachedUser;
let lastFetch = 0;
let inFlight = null;
let staleOffline = false;
const subscribers = new Set();

const FRESH_MS = 15 * 60 * 1000; // 15 min

function loadLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
}
function saveLS(user) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(user)); } catch {}
}

function notify() {
  const s = { user: cachedUser, authLoading: authLoadingGlobal, staleOffline };
  for (const fn of subscribers) { try { fn(s); } catch {} }
}

async function fetchMe({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedUser && now - lastFetch < FRESH_MS) return cachedUser;
  if (inFlight) return inFlight;

  authLoadingGlobal = true; notify();

  const ts = Date.now();
  const req = fetch(`/.auth/me?ts=${ts}`, { credentials: 'include', cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      const principal = data?.clientPrincipal || null;
      // Only update cache if we actually got something (may be null if logged out)
      cachedUser = principal;
      lastFetch = Date.now();
      staleOffline = false;
      saveLS(cachedUser);
      return cachedUser;
    })
    .catch(() => {
      // Network fail → keep whatever we had; mark staleOffline
      staleOffline = true;
      return cachedUser;
    })
    .finally(() => {
      inFlight = null;
      authLoadingGlobal = false;
      notify();
    });

  inFlight = req;
  return req;
}

let bgHooked = false;
function ensureBackgroundHooks() {
  if (bgHooked) return;
  bgHooked = true;

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchMe({ force: false });
  });

  setInterval(() => { fetchMe({ force: false }); }, FRESH_MS);
}

export default function useAuth() {
  const [state, setState] = useState({ user: cachedUser, authLoading: authLoadingGlobal, staleOffline });

  useEffect(() => {
    ensureBackgroundHooks();

    const sub = (s) => setState(s);
    subscribers.add(sub);

    if (!cachedUser && !inFlight) {
      // First ever load → try once; if it fails we still keep null (not signed in)
      fetchMe({ force: true });
    } else {
      // Emit immediately with cached user (from LS), then soft refresh
      sub({ user: cachedUser, authLoading: authLoadingGlobal, staleOffline });
      fetchMe({ force: false });
    }

    return () => { subscribers.delete(sub); };
  }, []);

  return state;
}

export function refreshAuth() {
  return fetchMe({ force: true });
}

export function clearAuthCache() {
  // Use this on explicit Sign out (online) only
  cachedUser = null;
  staleOffline = false;
  saveLS(null);
  lastFetch = 0;
  notify();
}
