// src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function useSwaUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/.auth/me", { credentials: "include" });
        const json = await res.json();
        const cp = json?.clientPrincipal || json?.[0]?.clientPrincipal || json?.[0] || null;
        const roles = (cp?.userRoles || []).filter(Boolean) || [];
        if (!ignore) setUser({
          userDetails: cp?.userDetails || "anonymous",
          identityProvider: cp?.identityProvider || "github",
          roles
        });
      } catch {
        if (!ignore) setUser({ userDetails: "anonymous", identityProvider: "github", roles: ["anonymous"] });
      }
    })();
    return () => { ignore = true; };
  }, []);
  return user;
}

export default function Admin() {
  const user = useSwaUser();

  // Invite form state
  const [swaName, setSwaName] = useState("");
  const [resourceGroup, setResourceGroup] = useState("");
  const [tester, setTester] = useState("");
  const [roles, setRoles] = useState({
    admin: false,
    writer: true,
    editor: true,
    deleter: false,
    exporter: true,
  });

  const roleList = useMemo(
    () => Object.entries(roles).filter(([,v])=>v).map(([k])=>k).join(","),
    [roles]
  );
  const cli = useMemo(() => {
    const name = swaName || "<SWA_NAME>";
    const rg = resourceGroup || "<RESOURCE_GROUP>";
    const who = tester || "<github-username-or-email>";
    const r = roleList || "<role1,role2>";
    return `az staticwebapp users invite --name ${name} --resource-group ${rg} --authentication-provider github --user-details ${who} --roles "${r}"`;
  }, [swaName, resourceGroup, tester, roleList]);

  if (!user) return <div style={{padding:16}}>Loading…</div>;

  const chip = (txt, cls) => (<span className={`chip ${cls}`} key={txt}>{txt}</span>);

  return (
    <div className="admin-wrap">
      <style>{`
        .admin-wrap { display:flex; flex-direction:column; gap:16px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; box-shadow:0 1px 2px rgba(0,0,0,0.03); }
        .row { display:flex; align-items:center; justify-content:space-between; }
        .title { font-size:28px; font-weight:600; }
        .subtle { color:#64748b; }
        .chip { display:inline-flex; align-items:center; padding:2px 8px; font-size:12px; border-radius:999px; border:1px solid #e5e7eb; margin-right:6px; margin-bottom:6px; }
        .btn { display:inline-block; padding:8px 14px; border:1px solid #e5e7eb; border-radius:10px; text-decoration:none; color:#111827; background:#fff; }
        .btn:hover { background:#f9fafb; }
        .grid { display:grid; grid-template-columns:1fr; gap:12px; }
        @media(min-width: 700px){ .grid-3 { grid-template-columns: repeat(3, 1fr); } }
        textarea, input { font: inherit; }
        input, textarea { border:1px solid #e5e7eb; border-radius:8px; padding:8px 12px; }
        .muted { color:#6b7280; font-size:12px; }
        /* Color chips */
        .admin    { background:#ecfdf5; border-color:#a7f3d0; color:#065f46; }
        .writer   { background:#eff6ff; border-color:#bfdbfe; color:#1e40af; }
        .editor   { background:#eef2ff; border-color:#c7d2fe; color:#3730a3; }
        .deleter  { background:#fef2f2; border-color:#fecaca; color:#991b1b; }
        .exporter { background:#fffbeb; border-color:#fde68a; color:#92400e; }
        .anonymous, .authenticated { background:#f3f4f6; border-color:#e5e7eb; color:#374151; }
        .h2 { font-size:18px; font-weight:600; margin-bottom:8px; }
      `}</style>

      <div className="row">
        <Link to="/" className="subtle">← Back to dashboard</Link>
        <div className="title">Admin</div>
        <div />
      </div>

      {/* Signed-in */}
      <div className="card">
        <div className="subtle" style={{display:"flex", flexWrap:"wrap", gap:8, alignItems:"center"}}>
          <span>Signed in as <strong>{user.userDetails}</strong> · Provider:</span>
          {chip(user.identityProvider, "authenticated")}
          <span style={{margin:"0 4px"}}>·</span>
          <span className="subtle">roles:</span>
          <div>{user.roles.map(r => chip(r, r))}</div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="card">
        <div className="h2">Admin Actions</div>
        <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
          <Link className="btn" to="/admin/users">Manage Users &amp; Roles</Link>
          <a className="btn" target="_blank" rel="noreferrer"
             href="https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/microsoft.web%2FstaticSites">
            Open Azure Portal (Static Web Apps)
          </a>
        </div>
      </div>

      {/* Roles in this app */}
      <div className="card">
        <div className="h2">Roles in this app</div>
        <ul className="subtle" style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:8}}>
          <li>{chip("admin","admin")} — Full access. Can perform all actions.</li>
          <li>{chip("writer","writer")} — Can add new readings.</li>
          <li>{chip("editor","editor")} — Can edit existing readings.</li>
          <li>{chip("deleter","deleter")} — Can delete readings.</li>
          <li>{chip("exporter","exporter")} — Can export CSV/XLSX via API.</li>
        </ul>
      </div>

      {/* Invite a tester */}
      <div className="card">
        <div className="h2">Invite a tester</div>
        <p className="subtle">This builds the Azure CLI command. Run it in your terminal to generate the invite link.</p>

        <div className="grid grid-3" style={{marginTop:12}}>
          <div>
            <div className="subtle" style={{marginBottom:6}}>Static Web App name</div>
            <input placeholder="e.g., pool-health" value={swaName} onChange={e=>setSwaName(e.target.value)} />
          </div>
          <div>
            <div className="subtle" style={{marginBottom:6}}>Resource group</div>
            <input placeholder="e.g., rg-pool-app" value={resourceGroup} onChange={e=>setResourceGroup(e.target.value)} />
          </div>
          <div>
            <div className="subtle" style={{marginBottom:6}}>Tester (GitHub username or email)</div>
            <input placeholder="octocat or name@example.com" value={tester} onChange={e=>setTester(e.target.value)} />
          </div>
        </div>

        <div style={{marginTop:12, display:"flex", gap:16, flexWrap:"wrap"}}>
          {Object.keys(roles).map(r => (
            <label key={r} className="subtle" style={{display:"inline-flex", gap:8, alignItems:"center"}}>
              <input type="checkbox" checked={roles[r]} onChange={()=>setRoles(prev=>({...prev, [r]: !prev[r]}))} />
              <span style={{textTransform:"capitalize"}}>{r}</span>
            </label>
          ))}
        </div>

        <div style={{marginTop:12}}>
          <textarea rows={3} readOnly value={cli}
            style={{width:"100%", fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"}} />
        </div>

        <div style={{marginTop:12, display:"flex", gap:12, flexWrap:"wrap"}}>
          <button className="btn" onClick={() => { navigator.clipboard?.writeText(cli); alert("CLI command copied."); }}>
            Copy CLI command
          </button>
          <a className="btn" target="_blank" rel="noreferrer"
             href="https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/microsoft.web%2FstaticSites">
            Open Azure Portal (Static Web Apps)
          </a>
        </div>

        <p className="muted" style={{marginTop:8}}>
          After you run the command, a one-time invite link is printed in the terminal. Share that link with the tester.
        </p>
      </div>
    </div>
  );
}
