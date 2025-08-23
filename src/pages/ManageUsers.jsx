import React, { useEffect, useMemo, useState } from "react";

const qs = (o) =>
  "?" +
  Object.entries(o)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    provider: "github",
    userId: "",
    email: "",
    roles: "authenticated",
    expirationHours: 48,
    domain: ""
  });
  const [inviteResult, setInviteResult] = useState(null);

  const providers = useMemo(() => ["github", "aad", "google", "twitter"], []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/manageUsers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveRoles = async (u, newRoles) => {
    const body = {
      provider: u.properties.provider,
      userId: u.properties.userId,
      roles: newRoles
    };
    const res = await fetch("/api/manageUsers/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  };

  const deleteUser = async (u) => {
    const res = await fetch("/api/manageUsers/delete", {
      method: "POST", // allow browsers that block DELETE w/ body; function also accepts DELETE
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: u.properties.provider, userId: u.properties.userId })
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  };

  const onChangeRoles = async (u, rolesStr) => {
    try {
      await saveRoles(u, rolesStr);
      await load();
    } catch (e) {
      alert(String(e));
    }
  };

  const onDelete = async (u) => {
    if (!confirm(`Delete user "${u.properties.displayName}"?`)) return;
    try {
      await deleteUser(u);
      await load();
    } catch (e) {
      alert(String(e));
    }
  };

  const openInvite = () => {
    setInviteOpen(true);
    setInviteResult(null);
  };
  const closeInvite = () => setInviteOpen(false);

  const submitInvite = async (e) => {
    e.preventDefault();
    setInviteResult(null);
    try {
      const res = await fetch("/api/manageUsers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setInviteResult(data);
    } catch (err) {
      setInviteResult({ error: String(err) });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">User &amp; Role Management</h1>
        <button
          className="px-3 py-2 rounded bg-black text-white"
          onClick={openInvite}
        >
          Invite User
        </button>
      </div>

      <div className="mb-4">
        <button
          className="px-3 py-2 rounded border"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div className="p-3 border border-red-400 bg-red-50 text-red-700 rounded mb-4">
          {err}
        </div>
      )}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Display Name</th>
              <th className="text-left p-2">Provider</th>
              <th className="text-left p-2">User ID</th>
              <th className="text-left p-2">Roles</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No users to display.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.properties?.displayName || u.name}</td>
                <td className="p-2">{u.properties?.provider}</td>
                <td className="p-2 font-mono text-xs">{u.properties?.userId || u.name}</td>
                <td className="p-2">
                  <input
                    defaultValue={u.properties?.roles || ""}
                    onBlur={(e) => onChangeRoles(u, e.target.value)}
                    className="w-full border rounded px-2 py-1"
                    placeholder="comma,separated,roles"
                    title="Edit roles and tab/click out to save"
                  />
                </td>
                <td className="p-2">
                  <button
                    className="px-2 py-1 rounded border hover:bg-gray-50"
                    onClick={() => onDelete(u)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">Invite User</h2>
            <form onSubmit={submitInvite} className="space-y-3">
              <div className="flex gap-2">
                <label className="w-32 pt-2">Provider</label>
                <select
                  className="flex-1 border rounded px-2 py-1"
                  value={inviteForm.provider}
                  onChange={(e) => setInviteForm(f => ({ ...f, provider: e.target.value }))}
                >
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <label className="w-32 pt-2">User ID</label>
                <input
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="e.g. internal-id-or-handle"
                  value={inviteForm.userId}
                  onChange={(e) => setInviteForm(f => ({ ...f, userId: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2">
                <label className="w-32 pt-2">Email</label>
                <input
                  type="email"
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="invitee@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2">
                <label className="w-32 pt-2">Roles</label>
                <input
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="comma,separated,roles"
                  value={inviteForm.roles}
                  onChange={(e) => setInviteForm(f => ({ ...f, roles: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <label className="w-32 pt-2">Expires (hrs)</label>
                <input
                  type="number"
                  min="1"
                  className="flex-1 border rounded px-2 py-1"
                  value={inviteForm.expirationHours}
                  onChange={(e) => setInviteForm(f => ({ ...f, expirationHours: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <label className="w-32 pt-2">Domain (opt)</label>
                <input
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="shown on invite UI"
                  value={inviteForm.domain}
                  onChange={(e) => setInviteForm(f => ({ ...f, domain: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="px-3 py-2 rounded border" onClick={closeInvite}>Close</button>
                <button className="px-3 py-2 rounded bg-black text-white">Create Invite</button>
              </div>
            </form>

            {inviteResult && (
              <div className="mt-4 p-3 border rounded bg-gray-50">
                <pre className="text-xs overflow-x-auto">{JSON.stringify(inviteResult, null, 2)}</pre>
                {inviteResult?.properties?.inviteUrl && (
                  <div className="mt-2">
                    <a className="text-blue-700 underline break-all" href={inviteResult.properties.inviteUrl} target="_blank" rel="noreferrer">
                      Open Invite Link
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
