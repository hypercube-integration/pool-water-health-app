import React, { useEffect, useMemo, useState } from "react";

/** --- Config ------------------------------------------------------------ */
const ROLE_OPTIONS = [
  "admin",
  "writer",
  "editor",
  "deleter",
  "exporter",
  "authenticated",
  "anonymous",
];

/** Normalize Azure SWA user payload into simple shape we can render */
function normalizeUsers(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((u) => {
    const props = u?.properties ?? {};
    const roles = (props.roles || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    return {
      id: u.id,
      location: u.location,
      name: u.name,
      type: u.type,
      provider: props.provider || "",
      userId: props.userId || "",
      displayName: props.displayName || "",
      roles,
      hasAcceptedInvitation: !!props.hasAcceptedInvitation,
      raw: u,
    };
  });
}

/** Badge for role chips */
function RoleBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
      {children}
    </span>
  );
}

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);

  // editingState keyed by userId+provider → { roles: Set<string>, saving: boolean }
  const [editing, setEditing] = useState({});
  const [busyIds, setBusyIds] = useState(new Set()); // disable row while saving/deleting

  const keyOf = (u) => `${u.provider}:${u.userId}`;

  // --- Fetch users on mount ------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading("loading");
        setError(null);
        const res = await fetch("/api/manageUsers", { method: "GET" });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`GET /api/manageUsers failed ${res.status}: ${txt || "(no body)"}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setUsers(normalizeUsers(data));
          setLoading("done");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || String(e));
          setLoading("error");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Editing helpers -----------------------------------------------------
  const isEditing = (u) => !!editing[keyOf(u)];
  const getEditRoles = (u) => editing[keyOf(u)]?.roles ?? new Set(u.roles);
  const toggleRole = (u, role) => {
    setEditing((prev) => {
      const k = keyOf(u);
      const current = prev[k]?.roles ? new Set(prev[k].roles) : new Set(u.roles);
      if (current.has(role)) current.delete(role);
      else current.add(role);
      return {
        ...prev,
        [k]: { roles: current, saving: false },
      };
    });
  };
  const startEdit = (u) => {
    setEditing((prev) => ({
      ...prev,
      [keyOf(u)]: { roles: new Set(u.roles), saving: false },
    }));
  };
  const cancelEdit = (u) => {
    setEditing((prev) => {
      const p = { ...prev };
      delete p[keyOf(u)];
      return p;
    });
  };

  // --- Save / Delete -------------------------------------------------------
  const saveRoles = async (u) => {
    const k = keyOf(u);
    const rolesArr = Array.from(getEditRoles(u));
    // Basic client-side guard
    if (!u.provider || !u.userId) {
      alert("Update failed: provider and userId are missing for this row.");
      return;
    }

    setBusyIds((s) => new Set([...s, k]));
    try {
      const res = await fetch("/api/manageUsers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: u.provider,
          userId: u.userId,
          roles: rolesArr.join(","),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Update failed: ${res.status} ${text || ""}`);
      }
      // reflect saved roles in table
      setUsers((prev) =>
        prev.map((x) =>
          keyOf(x) === k ? { ...x, roles: rolesArr } : x
        )
      );
      cancelEdit(u);
    } catch (e) {
      alert(e.message || "Failed to update roles");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(k);
        return n;
      });
    }
  };

  const deleteUser = async (u) => {
    const k = keyOf(u);
    if (!confirm(`Remove all roles from "${u.displayName}" (${u.provider})?`)) return;

    setBusyIds((s) => new Set([...s, k]));
    try {
      const res = await fetch("/api/manageUsers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: u.provider,
          userId: u.userId,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Delete failed: ${res.status} ${text || ""}`);
      }
      // After delete, remove from list (or you could set roles: [])
      setUsers((prev) => prev.filter((x) => keyOf(x) !== k));
      cancelEdit(u);
    } catch (e) {
      alert(e.message || "Failed to delete user");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(k);
        return n;
      });
    }
  };

  const rows = useMemo(() => users, [users]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Page header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">User &amp; Role Management</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Status / alerts */}
        {loading === "loading" && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
            Loading users…
          </div>
        )}
        {loading === "error" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {error || "Failed to load users."}
          </div>
        )}
        {loading === "done" && rows.length === 0 && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
            No users to display.
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Display Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Roles
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((u) => {
                const editingNow = isEditing(u);
                const disabled = busyIds.has(keyOf(u));
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{u.displayName || "(no name)"}</div>
                      <div className="text-xs text-gray-500">{u.location}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{u.provider}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                      <code className="rounded bg-gray-100 px-1 py-0.5 text-gray-800">
                        {u.userId}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {!editingNow ? (
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length ? (
                            u.roles.map((r) => <RoleBadge key={r}>{r}</RoleBadge>)
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {ROLE_OPTIONS.map((role) => {
                            const checked = getEditRoles(u).has(role);
                            return (
                              <label
                                key={role}
                                className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={checked}
                                  onChange={() => toggleRole(u, role)}
                                  disabled={disabled}
                                />
                                <span className="capitalize">{role}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex justify-end gap-2">
                        {!editingNow ? (
                          <>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => startEdit(u)}
                              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => deleteUser(u)}
                              className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => saveRoles(u)}
                              className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => cancelEdit(u)}
                              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer hint */}
        <p className="mt-4 text-xs text-gray-500">
          Tip: If updates fail with 401/403/404, verify your <code>staticwebapp.config.json</code> role rules,
          the function’s identity permissions on the SWA, and your <code>SWA_RESOURCE_ID</code>.
        </p>
      </main>
    </div>
  );
}
