import React, { useEffect, useMemo, useState } from "react";

/**
 * Normalise a SWA user coming from different ARM shapes.
 * - New shape: { id, name, properties: { displayName, provider, userId, roles } }
 * - Old shape: { displayName, provider, userId, roles }
 */
function normalizeUser(u) {
  const p = u?.properties || {};
  const displayName = p.displayName ?? u.displayName ?? "";
  const provider = p.provider ?? u.provider ?? "";
  const userId = p.userId ?? u.userId ?? u.name ?? "";
  const rolesRaw = p.roles ?? u.roles ?? "";
  const roles = rolesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  return { displayName, provider, userId, roles, _raw: u };
}

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

export default function AdminUsers() {
  const qs = useQuery();
  const debugMode = qs.has("debug");

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [debug, setDebug] = useState(null);
  const [error, setError] = useState(null);
  const [requestId, setRequestId] = useState("");
  const [timingMs, setTimingMs] = useState(null);
  const [status, setStatus] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setDebug(null);
    setTimingMs(null);
    setStatus(null);
    setRequestId("");

    const ts = Date.now();
    const url = `/api/manageUsers?ts=${ts}${debugMode ? "&debug=1" : ""}`;
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      setStatus(res.status);
      setTimingMs(performance.now() - performance.timeOrigin - performance.now() + performance.now()); // keep simple

      // try to pull a server-provided request id if any (middleware or app svc)
      const reqId =
        res.headers.get("x-ms-request-id") ||
        res.headers.get("x-ms-correlation-request-id") ||
        res.headers.get("x-request-id") ||
        "";
      setRequestId(reqId);

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(
          data?.error ||
            `HTTP ${res.status}${data && typeof data === "object" ? " (see debug)" : ""}`
        );
        if (debugMode) setDebug(data);
        setUsers([]);
        return;
      }

      // API returns either an array of users or { users, debug }
      let arr = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
      if (debugMode && data?.debug) setDebug(data.debug);

      setUsers(arr.map(normalizeUser));
    } catch (e) {
      setError(e.message || "Request failed");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugMode]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <a href="#/admin" className="text-blue-400 hover:underline">
        ← Back to Admin
      </a>

      <h1 className="text-4xl font-extrabold mt-4 mb-2">User &amp; Role Management</h1>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={fetchUsers}
          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>

        <a
          href="/api/manageUsers"
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:underline"
        >
          Open raw API
        </a>

        <span className="text-sm text-gray-400">
          Append <code>?debug=1</code> to this page to see the panel.
        </span>
      </div>

      <StatusBar status={status} timingMs={timingMs} requestId={requestId} />

      {error && (
        <div className="my-3 rounded border border-red-700 bg-red-900 text-red-100 p-3">
          <div className="font-semibold">ERROR</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      <UsersTable users={users} />

      {debugMode && (
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold">Debug</summary>
          <pre className="mt-2 p-3 rounded bg-black/40 overflow-auto text-xs">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function StatusBar({ status, timingMs, requestId }) {
  if (!status && !timingMs && !requestId) return null;
  return (
    <div className="text-sm text-gray-300 mb-3">
      <span className="mr-4">
        <strong>status:</strong> {status ?? "—"}
      </span>
      <span className="mr-4">
        <strong>time:</strong> {timingMs ? `${Math.round(timingMs)} ms` : "—"}
      </span>
      <span className="mr-4">
        <strong>req id:</strong> {requestId || "—"}
      </span>
    </div>
  );
}

function UsersTable({ users }) {
  return (
    <div className="mt-2">
      <div className="mb-2 font-semibold">Display Name&nbsp;&nbsp;Provider&nbsp;&nbsp;User ID&nbsp;&nbsp;Roles</div>
      {users.length === 0 ? (
        <div className="text-gray-400">No users to display.</div>
      ) : (
        <div className="overflow-auto rounded border border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <Th>Display Name</Th>
                <Th>Provider</Th>
                <Th>User ID</Th>
                <Th>Roles</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={`${u.provider}:${u.userId}`} className="odd:bg-gray-900 even:bg-gray-850">
                  <Td>{u.displayName}</Td>
                  <Td>{u.provider}</Td>
                  <Td className="font-mono">{u.userId}</Td>
                  <Td>{u.roles}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const Th = ({ children }) => (
  <th className="text-left py-2 px-3 font-semibold border-b border-gray-700">{children}</th>
);
const Td = ({ children, className = "" }) => (
  <td className={`py-2 px-3 align-top border-b border-gray-800 ${className}`}>{children}</td>
);
