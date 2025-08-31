// FILE: src/pages/ManageUsers.jsx  (DROP-IN REPLACEMENT)
// - Uses your existing /hooks/useUsers to fetch the list
// - Admin actions now show errors if API returns 403/500
// - Only enables role actions for admins/managers

import React, { useMemo, useState } from "react";
import { useAuth } from "../App";
import { toCsv, downloadCsv } from "../utils/csv";
import { useUsers } from "../hooks/useUsers";

const ROLE_OPTIONS = ["admin", "manager", "contributor", "viewer"];

export default function ManageUsersPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();

  const {
    rows, total, totalPages, loading, error,
    page, pageSize, search, sortBy, sortDir,
    setPage, setPageSize, setSearch, toggleSort, reload
  } = useUsers({ page: 1, pageSize: 10, sortBy: "name", sortDir: "asc" });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invProvider, setInvProvider] = useState("aad");
  const [invUser, setInvUser] = useState("");
  const [invRoles, setInvRoles] = useState(["viewer"]);
  const [invHours, setInvHours] = useState(24);
  const [inviteUrl, setInviteUrl] = useState("");

  const [actionMsg, setActionMsg] = useState(null);

  const cols = useMemo(() => ([
    { key: "name", headerName: "Name" },
    { key: "email", headerName: "Email", selector: (r) => r.email || "" },
    { key: "provider", headerName: "Provider" },
    {
      key: "roles",
      headerName: "Roles",
      selector: (r) => Array.isArray(r.roles) ? r.roles.join(", ") : (r.role || "")
    },
    { key: "__actions", headerName: "Actions" }
  ]), []);

  const canManage = !!isAdmin;

  const handleExport = () => {
    const csv = toCsv(rows, cols.filter(c=>c.key!=="__actions"));
    downloadCsv(csv, "users");
  };

  async function apiCall(url, init) {
    setActionMsg(null);
    const res = await fetch(url, { credentials: "include", ...init });
    let text = "";
    try { text = await res.text(); } catch {}
    if (!res.ok) {
      const msg = text || `${res.status} ${res.statusText}`;
      setActionMsg({ type: "error", text: msg });
      throw new Error(msg);
    }
    setActionMsg({ type: "ok", text: "Saved." });
    return text ? JSON.parse(text).catch(()=> ({})) : {};
  }

  async function setRole(user, role) {
    await apiCall("/api/users/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: user.provider, userId: user.id, roles: [role] })
    });
    reload();
  }
  async function clearRoles(user) {
    await apiCall("/api/users/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: user.provider, userId: user.id, roles: [] })
    });
    reload();
  }
  async function deleteUser(user) {
    if (!confirm(`Remove user from ${user.provider}? This clears their custom roles.`)) return;
    await apiCall("/api/users/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: user.provider, userId: user.id })
    });
    reload();
  }
  async function setProfile(user) {
    const name = prompt("Display name:", (user.name && user.name !== user.id) ? user.name : "") || "";
    const email = prompt("Email (optional):", user.email || "") || "";
    await apiCall("/api/profiles/upsert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: user.provider, userId: user.id, name: name.trim(), email: email.trim() })
    });
    reload();
  }

  async function createInvite(e) {
    e.preventDefault();
    setInviteUrl("");
    try {
      const data = await apiCall("/api/users/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: invProvider,
          userDetails: invUser.trim(),
          roles: invRoles,
          hours: Number(invHours) || 24
        })
      });
      if (data?.invitationUrl) setInviteUrl(data.invitationUrl);
    } catch {
      // message already set
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-4xl font-extrabold mb-4">Manage Users &amp; Roles</h1>

      {authLoading ? (
        <div className="text-gray-500 mb-4">Checking your access…</div>
      ) : !canManage ? (
        <div className="text-red-500 mb-4">You don’t have access to manage users.</div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button onClick={handleExport} className="px-3 py-2 rounded bg-gray-800 text-white hover:opacity-90">Export CSV</button>
        <button onClick={() => setInviteOpen(true)} className="px-3 py-2 rounded bg-blue-600 text-white hover:opacity-90">Invite user</button>

        <div className="ml-auto flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users…"
            className="border border-gray-300 rounded px-3 py-2 min-w-[240px]"
            aria-label="Search users"
          />
          <select
            value={pageSize}
            onChange={(e) => { const next = Number(e.target.value) || 10; setPageSize(next); setPage(1); }}
            className="border border-gray-300 rounded px-2 py-2"
            aria-label="Rows per page"
          >
            {[10, 20, 50].map((s) => <option key={s} value={s}>{s}/page</option>)}
          </select>
        </div>
      </div>

      {actionMsg && (
        <div className={`mb-3 px-3 py-2 rounded ${actionMsg.type === "ok" ? "bg-green-600/20 text-green-200" : "bg-red-600/20 text-red-200"}`}>
          {actionMsg.text}
        </div>
      )}

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {cols.map((c) => {
                const active = sortBy === c.key;
                return (
                  <th key={c.key} className="text-left font-medium px-3 py-2 border-b border-gray-200">
                    {c.key === "__actions" ? <span>{c.headerName}</span> : (
                      <button className={`inline-flex items-center gap-1 ${active ? "text-gray-900" : "text-gray-700"} hover:underline`} onClick={() => toggleSort(c.key)}>
                        <span>{c.headerName}</span>{active && <span aria-hidden="true">{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white text-gray-900">
            {loading && <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>}
            {!loading && error && <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-red-600">{error}</td></tr>}
            {!loading && !error && rows.length === 0 && <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-gray-500">No users found</td></tr>}

            {!loading && !error && rows.map((u) => (
              <tr key={`${u.provider}|${u.id}`} className="hover:bg-gray-50">
                <td className="px-3 py-2 border-b border-gray-100">{u.name || ""}</td>
                <td className="px-3 py-2 border-b border-gray-100">{u.email || ""}</td>
                <td className="px-3 py-2 border-b border-gray-100">
                  <span className="inline-block rounded px-2 py-1 border text-xs">{u.provider || "—"}</span>
                </td>
                <td className="px-3 py-2 border-b border-gray-100">
                  {Array.isArray(u.roles) && u.roles.length > 0 ? u.roles.map((r) => (
                    <span key={r} className="inline-block mr-1 mb-1 rounded-full px-2 py-0.5 border text-xs">{r}</span>
                  )) : <span className="text-gray-500">authenticated</span>}
                </td>
                <td className="px-3 py-2 border-b border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={() => setProfile(u)}>
                      Set name/email
                    </button>
                    {ROLE_OPTIONS.map((r) => (
                      <button key={r} className="px-2 py-1 text-xs rounded border hover:bg-gray-50" disabled={!canManage} onClick={() => setRole(u, r)}>
                        Set {r}
                      </button>
                    ))}
                    <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" disabled={!canManage} onClick={() => clearRoles(u)}>
                      Clear roles
                    </button>
                    <button className="px-2 py-1 text-xs rounded border text-red-600 hover:bg-red-50" disabled={!canManage} onClick={() => deleteUser(u)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">{total.toLocaleString()} total • Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded border border-gray-300 disabled:opacity-50" onClick={() => page > 1 && setPage(page - 1)} disabled={page <= 1}>Prev</button>
          <span className="text-sm text-gray-700">Page {page}</span>
          <button className="px-3 py-2 rounded border border-gray-300 disabled:opacity-50" onClick={() => page < totalPages && setPage(page + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5">
            <h2 className="text-lg font-semibold mb-3">Invite user</h2>
            <form onSubmit={createInvite} className="space-y-3">
              <div className="flex gap-3">
                <label className="text-sm w-28 pt-2">Provider</label>
                <select value={invProvider} onChange={(e)=>setInvProvider(e.target.value)} className="border rounded px-2 py-2 flex-1">
                  <option value="aad">Microsoft Entra ID (AAD)</option>
                  <option value="github">GitHub</option>
                </select>
              </div>
              <div className="flex gap-3">
                <label className="text-sm w-28 pt-2">User</label>
                <input value={invUser} onChange={(e)=>setInvUser(e.target.value)} required
                  placeholder={invProvider==="aad" ? "email or UPN (preferred)" : "github username"}
                  className="border rounded px-3 py-2 flex-1" />
              </div>
              <div className="flex gap-3">
                <label className="text-sm w-28 pt-2">Roles</label>
                <div className="flex-1 flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((r)=>(
                    <label key={r} className="text-sm inline-flex items-center gap-1">
                      <input type="checkbox" checked={invRoles.includes(r)} onChange={(e)=>{
                        setInvRoles((prev)=> e.target.checked ? [...prev, r] : prev.filter(x=>x!==r));
                      }}/>
                      {r}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <label className="text-sm w-28 pt-2">Expires (hrs)</label>
                <input type="number" min={1} max={168} value={invHours} onChange={(e)=>setInvHours(e.target.value)} className="border rounded px-3 py-2 w-28" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="px-3 py-2 rounded border" onClick={()=>setInviteOpen(false)}>Close</button>
                <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white">Create link</button>
              </div>
            </form>

            {inviteUrl && (
              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-1">Invitation URL:</div>
                <div className="p-2 border rounded break-all text-sm bg-gray-50">{inviteUrl}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
