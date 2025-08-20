// src/utils/debugFetch.js
export async function debugFetch(url, options = {}, { label = "api", log = true } = {}) {
  const start = performance.now();
  const reqId = Math.random().toString(36).slice(2, 8);
  const opts = {
    // Force network for debugging (avoid SW cache confusion)
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-client-trace-id": reqId,
      ...(options.headers || {}),
    },
    ...options,
  };

  let res, text, json, ok = false, err;

  try {
    if (log) console.groupCollapsed(`[${label}] ${opts.method || "GET"} ${url}  (#${reqId})`);
    if (log) {
      console.log("request", {
        url,
        method: opts.method || "GET",
        headers: opts.headers,
        cache: opts.cache,
        bodyPreview: typeof opts.body === "string" ? opts.body.slice(0, 500) : opts.body,
      });
    }

    res = await fetch(url, opts);
    const ct = res.headers.get("content-type") || "";
    text = await res.text();
    try { json = ct.includes("application/json") ? JSON.parse(text) : undefined; } catch {}

    ok = res.ok;

    const ms = Math.round(performance.now() - start);
    if (log) {
      console.log("response.meta", { status: res.status, statusText: res.statusText, ok, ms });
      console.log("response.headers", Object.fromEntries(res.headers.entries()));
      console.log("response.body", json ?? (text?.slice(0, 1000) || ""));
    }

    if (!ok) {
      const e = new Error(`HTTP ${res.status} ${res.statusText}`);
      e.status = res.status;
      e.body = json ?? text;
      throw e;
    }

    return { res, data: json ?? text, ms, reqId, raw: text };
  } catch (e) {
    err = e;
    if (log) console.error("error", e);
    throw e;
  } finally {
    if (log) console.groupEnd();
  }
}
