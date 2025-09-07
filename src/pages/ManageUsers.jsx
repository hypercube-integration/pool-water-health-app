// FILE: src/pages/ManageUsers.jsx
import React, { useMemo, useState } from "react";
import { useAuth } from "../App";
import { useUsers } from "../hooks/useUsers";
import { toCsv, downloadCsv } from "../utils/csv";
import { inviteUser, setRoles, clearRoles, deleteUser, setNameEmail } from "../services/usersService";

const ROLE_OPTIONS = ["admin","manager","contributor","viewer"];

export default function ManageUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    rows, total, totalPages, loading, error,
    page, pageSize, search, sortBy, sortDir,
    setPage, setPageSize, setSearch, toggleSort, reload
  } = useUsers({ page: 1, pageSize: 10, sortBy: "name", sortDir: "asc" });

  const [msg, setMsg] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invProvider, setInvProvider] = useState("aad");
  const [invUser, setInvUser] = useState("");
  const [invRoles, setInvRoles] = useState(["viewer"]);
  const [invHours, setInvHours] = useState(24);
  const [inviteUrl, setInviteUrl] = useState("");

  const columns = useMemo(() => ([
    { key: "name", headerName: "Name" },
    { key: "email", headerName: "Email" },
    { key: "provider", headerName: "Provider" },
    { key: "roles", headerName: "Roles", selector: (r)=> (r.roles||[]).join(", ") }
  ]), []);

  function doExport() {
    const csv = toCsv(rows, columns);
    downloadCsv(csv, "users");
  }

  async function doInvite(e){
    e.preventDefault();
    setMsg("");
    try {
      const { url } = await inviteUser({ provider: invProvider, userDetails: invUser.trim(), roles: invRoles, hours: invHours });
      setInviteUrl(url);
      setInviteOpen(false);
      setMsg("Invite created.");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function applyRoles(r, roles){
    setMsg("");
    try {
      await setRoles({ provider: r.provider, userId: r.id, roles });
      setMsg("Roles updated.");
      reload();
    } catch (e) { setMsg(e.message); }
  }
  async function doClear(r){ try { await clearRoles({ provider: r.provider, userId: r.id }); setMsg("Roles cleared."); reload(); } catch(e){ setMsg(e.message); } }
  async function doDelete(r){ if (!confirm("Delete this user from SWA?")) return; try { await deleteUser({ provider: r.provider, userId: r.id }); setMsg("User deleted."); reload(); } catch(e){ setMsg(e.message); } }
  async function doSetNameEmail(r){
    const name = prompt("Enter name", r.name || "");
    if (name === null) return;
    const email = prompt("Enter email", r.email || "");
    if (email === null) return;
    try {
      await setNameEmail({ provider: r.provider, userId: r.id, name, email });
      setMsg("Profile saved."); reload();
    } catch(e){ setMsg(e.message); }
  }

  return (
    <div className="p-4 text-white">
      <h1 className="text-3xl font-bold mb-4">Manage Users &amp; Roles</h1>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button className="px-3 py-2 rounded bg-gray-700" onClick={doExport}>Export CSV</button>
        <button className="px-3 py-2 rounded bg-blue-600" onClick={()=>setInviteOpen(true)}>Invite user</button>
        <input className="ml-2 px-2 py-1 rounded bg-neutral-800 border border-neutral-700" placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700" value={pageSize} onChange={e=>setPageSize(parseInt(e.target.value,10))}>
          {[10,20,50,100].map(n=><option key={n} value={n}>{n}/page</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-400">{loading ? "Loading…" : `${total} total`}</span>
      </div>

      {error && <div className="mb-3 text-red-400">Error: {error}</div>}
      {msg && <div className="mb-3 text-emerald-400">{msg}</div>}

      <div className="overflow-auto border border-neutral-800 rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              {columns.map(c=>(
                <th key={c.key} className="text-left px-3 py-2 cursor-pointer" onClick={()=>toggleSort(c.key)}>
                  {c.headerName}{sortBy===c.key ? (sortDir==="asc"?" ▲":" ▼"):""}
                </th>
              ))}
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={`${r.provider}:${r.id}`} className="border-t border-neutral-800">
                <td className="px-3 py-2">{r.name || r.id}</td>
                <td className="px-3 py-2">{r.email || ""}</td>
                <td className="px-3 py-2">{r.provider}</td>
                <td className="px-3 py-2">{(r.roles||[]).join(", ")}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button className="px-2 py-1 rounded bg-neutral-700" onClick={()=>doSetNameEmail(r)}>Set name/email</button>
                    <button className="px-2 py-1 rounded bg-neutral-700" onClick={()=>applyRoles(r, ["admin"])}>Set admin</button>
                    <button className="px-2 py-1 rounded bg-neutral-700" onClick={()=>applyRoles(r, ["manager"])}>Set manager</button>
                    <button className="px-2 py-1 rounded bg-neutral-700" onClick={()=>applyRoles(r, ["contributor"])}>Set contributor</button>
                    <button className="px-2 py-1 rounded bg-neutral-700" onClick={()=>applyRoles(r, ["viewer"])}>Set viewer</button>
                    <button className="px-2 py-1 rounded bg-neutral-800" onClick={()=>doClear(r)}>Clear roles</button>
                    <button className="px-2 py-1 rounded bg-red-700" onClick={()=>doDelete(r)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length===0 && (
              <tr><td className="px-3 py-4 text-gray-400" colSpan={5}>No users</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button disabled={page<=1} className="px-3 py-1 rounded border disabled:opacity-40" onClick={()=>setPage(page-1)}>Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button disabled={page>=totalPages} className="px-3 py-1 rounded border disabled:opacity-40" onClick={()=>setPage(page+1)}>Next</button>
      </div>

      {inviteOpen && (
        <form className="mt-6 p-4 border border-neutral-800 rounded max-w-xl bg-neutral-900" onSubmit={doInvite}>
          <h2 className="text-lg font-semibold mb-2">Invite user</h2>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-300">Provider</span>
              <select className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700" value={invProvider} onChange={e=>setInvProvider(e.target.value)}>
                <option value="aad">Microsoft (AAD)</option>
                <option value="github">GitHub</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-300">User (email for AAD, username for GitHub)</span>
              <input className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700" value={invUser} onChange={e=>setInvUser(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-300">Roles</span>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map(r=>(
                  <label key={r} className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={invRoles.includes(r)} onChange={e=>{
                      setInvRoles(s=> e.target.checked ? [...new Set([...s, r])] : s.filter(x=>x!==r));
                    }}/>
                    <span className="capitalize">{r}</span>
                  </label>
                ))}
              </div>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm text-gray-300">Expires (hours)</span>
              <input className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 w-24" type="number" min="1" max="168" value={invHours} onChange={e=>setInvHours(parseInt(e.target.value,10)||24)} />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="px-3 py-2 rounded bg-blue-600">Create invite</button>
            <button type="button" className="px-3 py-2 rounded border" onClick={()=>setInviteOpen(false)}>Cancel</button>
          </div>
          {inviteUrl && (
            <div className="mt-3 text-sm">
              <div className="text-gray-300">Invite URL:</div>
              <a href={inviteUrl} className="text-sky-400 underline break-all">{inviteUrl}</a>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
