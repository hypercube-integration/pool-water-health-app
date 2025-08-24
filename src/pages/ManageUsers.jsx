import React, { useState, useEffect, useMemo } from "react";

/** Small helpers */
const uniq = (arr) => Array.from(new Set(arr || []));
const hasAdmin = (roles) => (roles || []).some((r) => r.toLowerCase() === "admin");

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [auth, setAuth] = useState(null); // /.auth/me payload
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  /** Load the current user (clientPrincipal) */
  const loadAuth = async () => {
    try {
      setAuthLoading(true);
      const res = await fetch("/.auth/me", { credentials: "include" });
      // Azure SWA returns 200 with JSON or 204 when not signed in
      if (res.status === 204) {
        setAuth(null);
        return;
      }
      if (!res.ok) throw new Error(`/.auth/me failed: ${res.status}`);
      const data = await res.json();
      setAuth(data || null);
    } catch (e) {
      console.error("auth load error", e);
      setAuth(null);
    } finally {
      setAuthLoading(false);
    }
  };

  /** Derived: clientPrincipal + roles + admin flag */
  const clientPrincipal = useMemo(() => auth?.clientPrincipal || null, [auth]);
  const userRoles = useMemo(() => uniq(clientPrincipal?.userRoles || []), [clientPrincipal]);
  const isAdmin = useMemo(() => hasAdmin(userRoles), [userRoles]);

  /** Load users */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/manageUsers", { credentials: "include" });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Fetch users failed: ${res.status} ${body}`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  /** Admin-only: update roles for a user */
  const updateRoles = async (userId, roles) => {
    if (!isAdmin) {
      setError("You don't have permission to update roles.");
      return;
    }
    try {
      setStatusMessage("Updating...");
      setError(null);
      const res = await fetch("/api/manageUsers/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, roles }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Update failed: ${res.status} ${body}`);
      }
      setStatusMessage("Roles updated successfully.");
      await fetchUsers();
    } catch (err) {
      console.error("Update error:", err);
      setError(err.message || "Update failed.");
    } finally {
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  /** Admin-only: delete user */
  const deleteUser = async (userId) => {
    if (!isAdmin) {
      setError("You don't have permission to delete users.");
      return;
    }
    try {
      setStatusMessage("Deleting...");
      setError(null);
      const res = await fetch("/api/manageUsers/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Delete failed: ${res.status} ${body}`);
      }
      setStatusMessage("User deleted successfully.");
      await fetchUsers();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Delete failed.");
    } finally {
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  /** Initial load: auth first, then users */
  useEffect(() => {
    (async () => {
      await loadAuth();
      await fetchUsers();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "2rem", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>User & Role Management</h1>
        <div>
          <button onClick={fetchUsers} disabled={loading} style={{ padding: ".5rem 1rem" }}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* Identity status */}
      <section style={{ marginTop: ".75rem" }}>
        {authLoading ? (
          <div style={{ opacity: 0.7 }}>Checking your permissions…</div>
        ) : clientPrincipal ? (
          <div style={{ fontSize: ".95rem", opacity: 0.85 }}>
            Signed in as <strong>{clientPrincipal.userDetails}</strong>{" "}
            <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: isAdmin ? "#e6ffed" : "#f2f2f2", border: "1px solid #d9d9d9" }}>
              {isAdmin ? "Admin" : "View-only"}
            </span>
          </div>
        ) : (
          <div style={{ color: "crimson" }}>You are not signed in.</div>
        )}
      </section>

      {/* View-only banner */}
      {!isAdmin && clientPrincipal && (
        <div
          style={{
            marginTop: "1rem",
            padding: ".75rem 1rem",
            background: "#fff8e1",
            border: "1px solid #ffe0a3",
            borderRadius: 8,
            fontSize: ".95rem",
          }}
        >
          You have view-only access. Ask an admin to grant you the <code>admin</code> role to edit roles or delete users.
        </div>
      )}

      {/* Status & errors */}
      {statusMessage && (
        <div style={{ color: "green", marginTop: "1rem" }}>{statusMessage}</div>
      )}
      {error && (
        <div style={{ color: "crimson", marginTop: "1rem", whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
        {loading ? (
          <p>Loading users…</p>
        ) : users.length === 0 ? (
          <p>No users to display.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Display Name</th>
                <th style={th}>Provider</th>
                <th style={th}>User ID</th>
                <th style={th}>Roles</th>
                {isAdmin && <th style={th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const up = u.properties || {};
                const userId = up.userId;
                const currentRoles = up.roles || "";

                return (
                  <tr key={u.name}>
                    <td style={td}>{up.displayName}</td>
                    <td style={td}>{up.provider}</td>
                    <td style={td} title={userId} style={{ ...td, fontFamily: "monospace" }}>
                      {userId}
                    </td>

                    {/* Roles cell: input for admin, plain text otherwise */}
                    <td style={td}>
                      {isAdmin ? (
                        <input
                          type="text"
                          defaultValue={currentRoles}
                          placeholder="comma,separated,roles"
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next !== currentRoles) updateRoles(userId, next);
                          }}
                          style={{ width: "100%" }}
                        />
                      ) : (
                        <span>{currentRoles || "—"}</span>
                      )}
                    </td>

                    {/* Actions column only for admins */}
                    {isAdmin && (
                      <td style={td}>
                        <button
                          onClick={() => deleteUser(userId)}
                          style={{ padding: ".35rem .65rem" }}
                          title="Remove this user from the SWA user list"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Debug roles (optional, comment out if you don’t want it) */}
      {/* <pre style={{ marginTop: "1rem", background: "#f6f8fa", padding: "1rem", borderRadius: 8 }}>
        {JSON.stringify({ userRoles, isAdmin, clientPrincipal }, null, 2)}
      </pre> */}
    </div>
  );
}

/** simple table styles */
const th = {
  textAlign: "left",
  padding: ".5rem .6rem",
  borderBottom: "1px solid #eaeaea",
  fontWeight: 600,
  background: "#fafafa",
};

const td = {
  padding: ".5rem .6rem",
  borderBottom: "1px solid #f1f1f1",
};
