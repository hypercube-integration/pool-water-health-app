import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { debugFetch } from "../utils/debugFetch";

function Badge({ children, color = "slate" }) {
  const bg = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-800",
    slate: "bg-slate-200 text-slate-800",
  }[color];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}>{children}</span>;
}

export default function ManageUsers() {
  const [search] = useSearchParams();
  const debug = search.get("debug") === "1";

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  // live request diagnostics for on-screen panel
  const [diag, setDiag] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    setDiag(null);

    const url = `/api/manageUsers?ts=${Date.now()}`; // ts busts any SW cache in practice
    try {
      const { data, ms, reqId, raw, res } = await debugFetch(
        url,
        { method: "GET" },
        { label: "manageUsers", log: true }
      );

      setRows(Array.isArray(data?.users) ? data.users : []);
      setDiag({
        ok: true,
        url,
        method: "GET",
        status: res.status,
        ms,
        reqId,
        hint: res.status === 404 ? "Function not deployed or route mismatch" : "",
      });
    } catch (e) {
      // e.status if thrown by debugFetch
      setErr(e?.message || "Request failed");
      setDiag({
        ok: false,
        url,
        method: "GET",
        status: e?.status ?? 0,
        ms: null,
        reqId: null,
        hint:
          e?.status === 404
            ? "404 from SWA means: function folder missing, wrong function.json route, or SWA deployed older commit."
            : "",
        body: e?.body,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 max-w-5xl mx-auto text-slate-100">
      <div className="mb-4">
        <Link to="/admin" className="text-blue-300 hover:underline">← Back to Admin</Link>
      </div>
      <h1 className="text-3xl font-bold mb-4">User & Role Management</h1>

      {/* On-screen diagnostics */}
      {debug && (
        <div className="mb-4 rounded-lg border border-slate-600 bg-slate-800 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge color={diag?.ok ? "green" : "red"}>{diag?.ok ? "OK" : "ERROR"}</Badge>
            <code className="text-xs">{diag?.method} {diag?.url}</code>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>status: <b>{diag?.status ?? "—"}</b></div>
            <div>time: <b>{diag?.ms ? `${diag.ms} ms` : "—"}</b></div>
            <div>req id: <b>{diag?.reqId ?? "—"}</b></div>
            <div>hint: <span className="opacity-80">{diag?.hint}</span></div>
          </div>
          {diag?.body && (
            <pre className="mt-2 max-h-48 overflow-auto text-xs bg-black/40 p-2 rounded">{JSON.stringify(diag.body, null, 2)}</pre>
          )}
        </div>
      )}

      {err && (
        <div className="mb-4 rounded border border-red-600 bg-red-900/30 p-3 text-red-200">
          <b>Error:</b> {err}
          <div className="opacity-80 text-sm mt-1">
            Tip: open DevTools → Console; look for a collapsed group starting with
            <code className="mx-1">[manageUsers]</code> to see headers and raw body.
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={load}
          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <a
          className="text-xs text-blue-300 hover:underline"
          href="/api/manageUsers"
          target="_blank"
          rel="noreferrer"
        >
          Open raw API
        </a>
        <span className="text-xs opacity-70">Append <code>?debug=1</code> to this page to see the panel.</span>
      </div>

      <div className="rounded-lg border border-slate-600 bg-slate-800 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="text-left px-3 py-2">Display Name</th>
              <th className="text-left px-3 py-2">Provider</th>
              <th className="text-left px-3 py-2">User ID</th>
              <th className="text-left px-3 py-2">Roles</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 opacity-70">
                  {loading ? "Loading…" : "No users to display."}
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={`${u.provider}:${u.userId}`} className="odd:bg-slate-900/20">
                  <td className="px-3 py-2">{u.displayName || "—"}</td>
                  <td className="px-3 py-2">{u.provider}</td>
                  <td className="px-3 py-2">{u.userId}</td>
                  <td className="px-3 py-2">{Array.isArray(u.roles) ? u.roles.join(", ") : ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
