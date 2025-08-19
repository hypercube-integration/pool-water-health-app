import { Link } from "react-router-dom";

export default function Admin() {
  return (
    <div>
      <style>{`
        .card { background:#0f172a; border:1px solid #1f2937; border-radius:14px; padding:16px; }
        .h1 { font-size:24px; font-weight:700; margin-bottom:12px; }
        .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }
        .role { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:4px 10px; font-size:12px; border:1px solid #374151; }
        .role.admin { background:#111827; color:#fcd34d; border-color:#4b5563; }
        .role.writer { background:#111827; color:#60a5fa; border-color:#374151; }
        .role.editor { background:#111827; color:#34d399; border-color:#374151; }
        .role.deleter { background:#111827; color:#f87171; border-color:#374151; }
        .role.exporter { background:#111827; color:#a78bfa; border-color:#374151; }
        .btn { display:inline-block; padding:10px 12px; border-radius:10px; background:#1f2937; border:1px solid #374151; color:#fff; text-decoration:none; }
        .btn:hover { background:#243044; }
      `}</style>

      <h1 className="h1">Admin</h1>

      <div className="grid">
        <section className="card">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Roles</h2>
          <p style={{ color: "#94a3b8", marginTop: 8, marginBottom: 12 }}>
            App roles available to users:
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="role admin">admin</span>
            <span className="role writer">writer</span>
            <span className="role editor">editor</span>
            <span className="role deleter">deleter</span>
            <span className="role exporter">exporter</span>
          </div>
        </section>

        <section className="card">
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Admin Actions</h2>
          <p style={{ color: "#94a3b8", marginTop: 8 }}>Manage user access and roles.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn" to="/admin/users">Manage Users &amp; Roles →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
