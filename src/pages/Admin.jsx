// src/pages/Admin.jsx
import { useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import RoleBadge from '../components/RoleBadge';

const LS_KEY = 'pool-admin-config';

const ROLE_INFO = [
  { id: 'admin',    label: 'admin',    desc: 'Full access. Can perform all actions.' },
  { id: 'writer',   label: 'writer',   desc: 'Can add new readings.' },
  { id: 'editor',   label: 'editor',   desc: 'Can edit existing readings.' },
  { id: 'deleter',  label: 'deleter',  desc: 'Can delete readings.' },
  { id: 'exporter', label: 'exporter', desc: 'Can export CSV/XLSX via API.' },
];

export default function Admin() {
  const { user, authLoading } = useAuth();
  const roles = user?.userRoles || [];
  const isAdmin = roles.includes('admin');

  const [swaName, setSwaName] = useState('');
  const [resourceGroup, setResourceGroup] = useState('');
  const [tester, setTester] = useState(''); // github username or email
  const [chosen, setChosen] = useState(['writer', 'editor', 'deleter', 'exporter']); // default recommended

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if (saved.swaName) setSwaName(saved.swaName);
      if (saved.resourceGroup) setResourceGroup(saved.resourceGroup);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ swaName, resourceGroup }));
    } catch {}
  }, [swaName, resourceGroup]);

  const toggleRole = (id) => {
    setChosen((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const roleString = useMemo(() => (chosen.length ? chosen.join(',') : 'writer'), [chosen]);

  const cli = useMemo(() => {
    const base = [
      'az staticwebapp users invite',
      `--name ${swaName || '<SWA_NAME>'}`,
      `--resource-group ${resourceGroup || '<RESOURCE_GROUP>'}`,
      '--authentication-provider github',
      `--user-details ${tester || '<github-username-or-email>'}`,
      `--roles "${roleString}"`
    ];
    return base.join(' ');
  }, [swaName, resourceGroup, tester, roleString]);

  const copy = async (text) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea'); ta.value = text;
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      alert('Copied to clipboard');
    } catch { alert('Copy failed.'); }
  };

  if (authLoading) return <div className="container section">Loading…</div>;

  return (
    <div className="container">
      <h1>Admin</h1>

      {!user ? (
        <div className="section">You must sign in to view this page.</div>
      ) : !isAdmin ? (
        <div className="section">You’re signed in as <strong>{user?.userDetails}</strong> but don’t have the <RoleBadge r="admin" /> role.</div>
      ) : (
        <>
          {/* Who am I */}
          <div className="section" style={{ display: 'grid', gap: 8 }}>
            <div>
              Signed in as <strong>{user?.userDetails}</strong> · Provider: <code>{user?.identityProvider || 'github'}</code>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {roles.map((r) => <RoleBadge key={r} r={r} />)}
              {!roles.length && <span>(no roles)</span>}
            </div>
          </div>

          {/* Role catalogue */}
          <div className="section">
            <h3 style={{ marginTop: 0 }}>Roles in this app</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {ROLE_INFO.map(info => (
                <li key={info.id} style={{ margin: '6px 0' }}>
                  <RoleBadge r={info.label} /> — {info.desc}
                </li>
              ))}
            </ul>
          </div>

          {/* Invite composer */}
          <div className="section">
            <h3 style={{ marginTop: 0 }}>Invite a tester</h3>
            <p style={{ marginTop: 0, color: '#475569' }}>
              This builds the Azure CLI command. Run it in your terminal to generate the invite link.
            </p>

            <div className="admin-grid">
              <label className="admin-field">
                <span>Static Web App name</span>
                <input value={swaName} onChange={(e)=>setSwaName(e.target.value)} placeholder="e.g., pool-health" />
              </label>

              <label className="admin-field">
                <span>Resource group</span>
                <input value={resourceGroup} onChange={(e)=>setResourceGroup(e.target.value)} placeholder="e.g., rg-pool-app" />
              </label>

              <label className="admin-field">
                <span>Tester (GitHub username or email)</span>
                <input value={tester} onChange={(e)=>setTester(e.target.value)} placeholder="octocat or name@example.com" />
              </label>
            </div>

            <div className="section" style={{ background: 'rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {ROLE_INFO.map(info => (
                  <label key={info.id} className="chip" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={chosen.includes(info.id)}
                      onChange={() => toggleRole(info.id)}
                      style={{ marginRight: 6 }}
                    />
                    {info.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="code-block">
              <code style={{ whiteSpace: 'pre-wrap' }}>{cli}</code>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => copy(cli)}>Copy CLI command</button>
              <a
                className="secondary chip"
                href="https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Web%2FstaticSites"
                target="_blank" rel="noreferrer"
              >
                Open Azure Portal (Static Web Apps)
              </a>
            </div>

            <p style={{ color: '#64748b', marginTop: 10 }}>
              After you run the command, a one-time invite link is printed in the terminal. Share that link with the tester.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
