// src/utils/offline.js
// Lightweight offline queue for API writes (POST/PUT/DELETE).
// Uses localStorage; replays when online. No external deps.

const LS_QUEUE_KEY = 'pool-offline-queue-v1';
const LS_META_KEY  = 'pool-offline-meta-v1';

let subscribers = new Set(); // notify on sync
let syncing = false;

function loadQueue() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_QUEUE_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveQueue(q) {
  try { localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(q)); } catch {}
}

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(LS_META_KEY) || '{}'); } catch { return {}; }
}
function saveMeta(meta) {
  try { localStorage.setItem(LS_META_KEY, JSON.stringify(meta)); } catch {}
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getStatus() {
  const q = loadQueue();
  const meta = loadMeta();
  return {
    online: navigator.onLine,
    queued: q.length,
    lastSyncAt: meta.lastSyncAt || null,
    syncing,
  };
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
function emit(evt) {
  const st = getStatus();
  for (const fn of subscribers) { try { fn(evt, st); } catch {} }
}

export function enqueue({ method, url, body, headers }) {
  const id = makeId();
  const op = {
    id,
    method: method || 'POST',
    url,
    body: body ?? null,
    headers: headers ?? { 'Content-Type': 'application/json' },
    enqueuedAt: Date.now(),
  };
  const q = loadQueue();
  q.push(op);
  saveQueue(q);
  emit({ type: 'enqueue', id });
  return id;
}

async function doFetch(op) {
  const init = {
    method: op.method,
    credentials: 'include',
    headers: op.headers || { 'Content-Type': 'application/json' },
  };
  if (op.body != null) {
    init.body = typeof op.body === 'string' ? op.body : JSON.stringify(op.body);
  }
  return fetch(op.url, init);
}

export async function syncNow() {
  if (syncing) return;
  const q = loadQueue();
  if (!q.length) return;

  syncing = true; emit({ type: 'sync-start' });

  let remaining = loadQueue();
  const next = () => (remaining.length ? remaining[0] : null);

  while (next()) {
    if (!navigator.onLine) break;
    const op = next();

    try {
      const res = await doFetch(op);
      if (!res.ok) {
        // If it's an auth error, stop; otherwise drop this op to avoid a jam.
        if (res.status === 401 || res.status === 403 || res.status >= 500) {
          // keep the op for a later retry unless it's 4xx (but not 409)
          if (res.status >= 400 && res.status < 500 && res.status !== 409) {
            // likely bad request; drop it
            remaining.shift();
          }
          break;
        } else {
          // 4xx like 409/422: drop to avoid infinite loop
          remaining.shift();
        }
      } else {
        // success: remove and continue
        remaining.shift();
      }
      saveQueue(remaining);
      emit({ type: 'sync-progress', remaining: remaining.length });
    } catch {
      // Network fail; keep op and stop
      break;
    }
  }

  if (!remaining.length) {
    const meta = loadMeta();
    meta.lastSyncAt = Date.now();
    saveMeta(meta);
  }

  syncing = false; emit({ type: 'sync-end' });
}

export function initOfflineQueue() {
  // Kick a sync whenever we come online
  window.addEventListener('online', () => syncNow());
  // Small periodic nudge (in case 'online' doesn't fire)
  const interval = setInterval(() => {
    if (navigator.onLine) syncNow();
  }, 20_000);
  // First attempt shortly after load
  setTimeout(() => { if (navigator.onLine) syncNow(); }, 1500);

  // Return cleanup
  return () => clearInterval(interval);
}

// Convenience helpers that try network first; if network fails, queue.
async function tryOrQueue(method, url, body) {
  try {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, queued: false, res };
  } catch {
    enqueue({ method, url, body });
    return { ok: true, queued: true, res: null };
  }
}

export const offlineApi = {
  post:  (url, body) => tryOrQueue('POST', url, body),
  put:   (url, body) => tryOrQueue('PUT', url, body),
  delete:(url, body) => tryOrQueue('DELETE', url, body),
};
