// src/pages/ManageUsers.jsx
import React, { useEffect, useMemo, useState } from "react";

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

// Normalize roles coming from ARM (can be string, array, or undefined)
function toRoleArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Make a nice, consistent label for providers
function labelForProvider(p) {
  if (!p) return "";
  const map = { github: "GitHub", aad: "Microsoft Entra (AAD)", twitter: "Twitter", facebook: "Facebook", google: "Google" };
  return map[p.toLowerCase()] || p;
}

// Catalog of roles your app uses. Change here to add/remove roles shown in editor.
const ROLE_CATALOG = ["admin", "writer", "editor", "deleter", "exporter", "authenticated", "anonymous"];

/* -------------------------------------------------------
   Tiny UI bits (unstyled, light theme)
------------------------------------------------------- */

function Chip({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: 12,
        background: "#eef2ff",
        color: "#1e3a8a",
        border: "1px solid #c7d2fe",
        borderRadius: 999,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  );
}

function Button({ children, kind = "primary", ...rest }) {
  const palette =
    kind === "primary"
      ? { bg: "#2563eb", b: "#1d4ed8", fg: "#fff", hover: "#1d4ed8" }
      : kind === "ghost"
      ? { bg: "transparent", b: "#cbd5e1", fg: "#111827", hover: "#f3f4f6" }
      : { bg: "#ef4444", b: "#dc2626", fg: "#fff", hover: "#dc2626" }; // danger

  return (
    <button
      {...rest}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.b}`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 14,
        cursor: "pointer",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = palette.hover)}
      onMouseOut={(e) => (e.currentTarget.style.background = palette.bg)}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------
   Main page
------------------------------------------------------- */

export default function ManageUsers() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const [auth, setAuth] = useState(null); // /.auth/me
  const [isAdmin, setIsAdmin] = useState(false);

  const [rows, setRows] = useState([]); // normalized users
  const [editRow, setEditRow] = useState(null); // { ...row, nextRoles: [] }

  const search =
    typeof window !== "undefined" && window.location && window.location.search
      ? window.location.search
      : "";
  const debug = new URLSearchParams(search).get("debug");

  // Fetch auth principal to decide if current user is admin
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/.auth/me", { credentials: "include" });
        if (!meRes.ok) throw new Error(`/.auth/me failed ${meRes.status}`);
        const meJson = await meRes.json();
        if (cancelled) return;

        const principal = Array.isArray(meJson) ? meJson[0] : meJson;
        setAuth(principal || null);

        const roles = toRoleArray(principal?.userRoles);
        setIsAdmin(roles.includes("admin"));
      } catch (e) {
        // If /.auth/me fails, treat as not admin
        setAuth(null);
        setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch users from your API
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const url = debug ? `/api/manageUsers?debug=1` : `/api/manageUsers`;
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`GET /api/manageUsers failed ${res.status}: ${text}`);
        }
        const json = await res.json();
        if (cancelled) return;

        const normalized = (Array.isArray(json) ? json : []).map((u) => {
          const provider = u.properties?.provider ?? u.provider ?? "";
          const userId = u.properties?.userId ?? u.userId ?? u.name ?? "";
          const display = u.properties?.displayName ?? u.displayName ?? userId;
          const rolesArr = toRoleArray(u.properties?.roles ?? u.roles);

          return {
            key: `${provider}:${userId}`,
            provider,
            providerLabel: labelForProvider(provider),
            userId,
            displayName: display,
            roles: rolesArr, // store as array
            raw: u,
          };
        });

        // Sort by provider then displayName for stable, pleasant UI
        normalized.sort((a, b) => {
          if (a.provider === b.provider) return a.displayName.localeCompare(b.displayName);
          return a.provider.localeCompare(b.provider);
        });

        setRows(normalized);
      } catch (e) {
        setErr(e.message || String(e));
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debug]);

  const onEdit = (row) => {
    setErr(null);
    setEditRow({
      ...row,
      nextRoles: [...row.roles], // start with current roles
    });
  };

  const onToggleRole = (role) => {
    if (!editRow) return;
    const set = new Set(editRow.nextRoles);
    if (set.has(role)) set.delete(role);
    else set.add(role);
    setEditRow({ ...editRow, nextRoles: Array.from(set) });
  };

  const onCancelEdit = () => {
    setEditRow(null);
  };

  const onSave = async () => {
    if (!editRow) return;

    // Basic guard; API expects provider, userId, roles (CSV)
    if (!editRow.provider || !editRow.userId) {
      setErr("provider and userId are required.");
      return;
    }

    const payload = {
      provider: editRow.provider,
      userId: editRow.userId,
      roles: Array.isArray(editRow.nextRoles)
        ? editRow.nextRoles.join(",")
        : String(editRow.nextRoles || ""),
    };

    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/manageUsers/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Update failed: ${res.status} ${t}`);
      }

      // Success: update local row roles
      const updated = rows.map((r) =>
        r.key === editRow.key ? { ...r, roles: [...editRow.nextRoles] } : r
      );
      setRows(updated);
      setEditRow(null);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const tableBody = useMemo(() => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>
            Loading users…
          </td>
        </tr>
      );
    }

    if (err) {
      return (
        <tr>
          <td colSpan={5} style={{ padding: 16, color: "#b91c1c", background: "#fef2f2" }}>
            Error: {err}
          </td>
        </tr>
      );
    }

    if (!rows.length) {
      return (
        <tr>
          <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>
            No users to display.
          </td>
        </tr>
      );
    }

    return rows.map((r) => (
      <tr key={r.key} style={{ borderTop: "1px solid #e5e7eb" }}>
        <td style={{ padding: 12 }}>{r.displayName}</td>
        <td style={{ padding: 12 }}>{r.providerLabel}</td>
        <td style={{ padding: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontSize: 12 }}>
          {r.userId}
        </td>
        <td style={{ padding: 12 }}>
          {r.roles.length ? r.roles.map((role) => <Chip key={role}>{role}</Chip>) : <span style={{ color: "#6b7280" }}>—</span>}
        </td>
        <td style={{ padding: 12, textAlign: "right" }}>
          <Button
            kind="ghost"
            disabled={!isAdmin}
            onClick={() => onEdit(r)}
            title={isAdmin ? "Edit roles" : "Admins only"}
          >
            Edit
          </Button>
        </td>
      </tr>
    ));
  }, [rows, loading, err, isAdmin]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>
          User & Role Management
        </h1>
        <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
          View and edit application roles for authenticated users.
        </p>
      </header>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow:
            "0 1px 1px rgba(0,0,0,0.04), 0 2px 2px rgba(0,0,0,0.04), 0 4px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ color: "#374151", fontWeight: 600 }}>Users</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {debug && (
                <a
                  href="/api/manageUsers?debug=1"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: "#1d4ed8", textDecoration: "underline" }}
                >
                  Open raw API (debug)
                </a>
              )}
              <Button kind="ghost" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={thStyle}>Display Name</th>
                <th style={thStyle}>Provider</th>
                <th style={thStyle}>User ID</th>
                <th style={thStyle}>Roles</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>{tableBody}</tbody>
          </table>
        </div>
      </div>

      {/* Edit Drawer / Modal */}
      {editRow && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={(e) => {
            // click backdrop to close
            if (e.target === e.currentTarget) onCancelEdit();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontWeight: 700, color: "#111827" }}>Edit roles</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                {editRow.displayName} • {labelForProvider(editRow.provider)} •{" "}
                <span
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                  }}
                >
                  {editRow.userId}
                </span>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                  Select roles
                </legend>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                  {ROLE_CATALOG.map((role) => {
                    const checked = editRow.nextRoles.includes(role);
                    const id = `role-${role}`;
                    return (
                      <label
                        key={role}
                        htmlFor={id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          cursor: "pointer",
                          background: checked ? "#eff6ff" : "#fff",
                        }}
                      >
                        <input
                          id={id}
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleRole(role)}
                        />
                        <span style={{ textTransform: "capitalize" }}>{role}</span>
                      </label>
                    );
                  })}
                </div>
                <p style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
                  Tip: “admin” implicitly allows access to all admin-only APIs and pages.
                </p>
              </fieldset>
            </div>

            <div
              style={{
                padding: 12,
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <Button kind="ghost" onClick={onCancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: 12,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "#6b7280",
};
