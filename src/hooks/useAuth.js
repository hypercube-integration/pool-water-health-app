// src/hooks/useAuth.js
// Efficient, shared auth state for the entire app.
// - One network call on first use (per tab), then cached
// - Soft refresh at most every 15 minutes, or when page becomes visible
// - Multiple components reuse the same result; no duplicate fetches

import { useEffect, useState } from 'react';

// ---- module-scoped singleton state ----
let cachedUser = null;
let authLoadingGlobal = false;
let lastFetch = 0;
let inFlight = null;
const subscribers = new Set();

const FRESH_MS = 15 * 60 * 1000; // 15 minutes

function notify() {
  for (const fn of subscribers) {
    try { fn({ user: cachedUser, authLoading: authLoadingGlobal }); } catch {}
  }
}

async function fetchMe({ force = false } = {}) {
  const now = Date.now();
  // Use cache if fresh
  if (!force && cachedUser && now - lastFetch < FRESH_MS) {
    return cachedUser;
  }
  // Reuse in-flight request
  if (inFlight) return inFlight;

  authLoadingGlobal = true; notify();

  const ts = Date.now();
  const req = fetch(`/.auth/me?ts=${ts}`, { credentials: 'include', cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      cachedUser = data?.clientPrincipal || null;
      lastFetch = Date.now();
      return cachedUser;
    })
    .catch(() => {
      // Keep whatever we had; don't thrash cache on failure
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

// Kick a gentle background refresh on visibility change (once per module)
let bgHooked = false;
function ensureBackgroundHooks() {
  if (bgHooked) return;
  bgHooked = true;

  // When tab becomes visible, refresh if stale
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchMe({ force: false });
  });

  // Safety: periodic refresh (one timer for the tab)
  setInterval(() => {
    fetchMe({ force: false });
  }, FRESH_MS);
}

// ---- public API ----
export default function useAuth() {
  const [state, setState] = useState({ user: cachedUser, authLoading: !cachedUser });

  useEffect(() => {
    ensureBackgroundHooks();

    // Subscribe to global changes
    const sub = (s) => setState(s);
    subscribers.add(sub);

    // First load if we have no cache
    if (!cachedUser && !inFlight) {
      fetchMe({ force: true });
    } else {
      // Emit current immediately
      sub({ user: cachedUser, authLoading: authLoadingGlobal });
      // If stale, refresh in background
      fetchMe({ force: false });
    }

    return () => { subscribers.delete(sub); };
  }, []);

  return state;
}

// Manual refresh you can call after sign-in/out flows, etc.
export function refreshAuth() {
  return fetchMe({ force: true });
}
