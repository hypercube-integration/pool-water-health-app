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
        // SWA returns { clientPrincipal } or an array in some hosts; handle both
        const cp =
          json?.clientPrincipal ||
          json?.[0]?.clientPrincipal ||
          json?.[0] ||
          null;

        const roles = (cp?.userRoles || []).filter(Boolean);
        if (!ignore) {
          setUser({
            userDetails: cp?.userDetails || "anonymous",
            identityProvider: cp?.identityProvider || "github",
            roles,
          });
        }
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

  // --- Invite tester form state (to mirror your existing page) ---
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
    () => Object.entries(roles).filter(([, v]) => v).map(([k]) => k).join(","),
    [roles]
  );

  const cli = useMemo(() => {
    const name = swaName || "<SWA_NAME>";
    const rg = resourceGroup || "<RESOURCE_GROUP>";
    const who = tester || "<github-username-or-email>";
    const r = roleList || "<role1,role2>";
    return `az staticwebapp users invite --name ${name} --resource-group ${rg} --authentication-provider github --user-details ${who} --roles "${r}"`;
  }, [swaName, resourceGroup, tester, roleList]);

  const badge = (txt, cls) => (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-md border ${cls}`}>{txt}</span>
  );

  if (!user) return <div className="p-4">Loading…</div>;

  const roleBadges = {
    admin:  "bg-green-50 border-green-200 text-green-700",
    writer: "bg-blue-50  border-blue-200  text-blue-700",
    editor: "bg-sky-50   border-sky-200   text-sky-700",
    deleter:"bg-rose-50  border-rose-200  text-rose-700",
    exporter:"bg-amber-50 border-amber-200 text-amber-700",
    anonymous:"bg-gray-50 border-gray-200 text-gray-700",
    authenticated:"bg-gray-50 border-gray-200 text-gray-700",
  };

  return (
    <div className="space-y-6">
      {/* Back link + title */}
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <div />
      </div>

      {/* Signed in bar */}
      <div className="rounded-xl border p-4 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Signed in as <span className="font-medium">{user.userDetails}</span> · Provider:</span>
          {badge(user.identityProvider, "bg-gray-50 border-gray-200 text-gray-700")}
          <span className="hidden sm:inline">·</span>
          <div className="flex flex-wrap gap-1">
            {user.roles.map(r => (
              <span key={r}>{badge(r, roleBadges[r] || "bg-gray-50 border-gray-200 text-gray-700")}</span>
            ))}
          </div>
        </div>
      </div>

      {/* --- NEW: Admin Actions --- */}
      <div className="rounded-xl border p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Admin Actions</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/admin/users"
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-center"
          >
            Manage Users &amp; Roles
          </Link>
          <a
            href="https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/microsoft.web%2FstaticSites"
            target="_blank" rel="noreferrer"
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-center"
          >
            Open Azure Portal (Static Web Apps)
          </a>
        </div>
      </div>

      {/* Roles in this app */}
      <div className="rounded-xl border p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Roles in this app</h2>
        <ul className="space-y-2 text-sm">
          <li>{badge("admin", roleBadges.admin)} — Full access. Can perform all actions.</li>
          <li>{badge("writer", roleBadges.writer)} — Can add new readings.</li>
          <li>{badge("editor", roleBadges.editor)} — Can edit existing readings.</li>
          <li>{badge("deleter", roleBadges.deleter)} — Can delete readings.</li>
          <li>{badge("exporter", roleBadges.exporter)} — Can export CSV/XLSX via API.</li>
        </ul>
      </div>

      {/* Invite a tester */}
      <div className="rounded-xl border p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Invite a tester</h2>
        <p className="text-sm text-gray-700 mb-4">
          This builds the Azure CLI command. Run it in your terminal to generate the invite link.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Static Web App name</label>
            <input
              className="border rounded px-3 py-2"
              placeholder="e.g., pool-health"
              value={swaName}
              onChange={e => setSwaName(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Resource group</label>
            <input
              className="border rounded px-3 py-2"
              placeholder="e.g., rg-pool-app"
              value={resourceGroup}
              onChange={e => setResourceGroup(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Tester (GitHub username or email)</label>
            <input
              className="border rounded px-3 py-2"
              placeholder="octocat or name@example.com"
              value={tester}
              onChange={e => setTester(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {Object.keys(roles).map((r) => (
            <label key={r} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roles[r]}
                onChange={() => setRoles(prev => ({ ...prev, [r]: !prev[r] }))}
              />
              <span className="capitalize">{r}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={3} readOnly value={cli} />
        </div>

        <div className="mt-3">
          <button
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            onClick={() => {
              navigator.clipboard?.writeText(cli);
              alert("CLI command copied.");
            }}
          >
            Copy CLI command
          </button>
          <a
            className="ml-3 px-4 py-2 border rounded-lg hover:bg-gray-50"
            href="https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/microsoft.web%2FstaticSites"
            target="_blank" rel="noreferrer"
          >
            Open Azure Portal (Static Web Apps)
          </a>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          After you run the command, a one-time invite link is printed in the terminal. Share that link with the tester.
        </p>
      </div>
    </div>
  );
}
