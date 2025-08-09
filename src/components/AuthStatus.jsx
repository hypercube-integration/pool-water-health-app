import { useEffect, useState } from 'react';

/**
 * AuthStatus reads /.auth/me (Azure Static Web Apps)
 * and shows the current identity + quick Sign in/Sign out links.
 */
export default function AuthStatus() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      setLoading(true);
      const res = await fetch('/.auth/me', { credentials: 'include' });
      // When logged out, SWA returns 200 with empty body or an object with empty clientPrincipal
      const data = await res.json().catch(() => ({}));
      setMe(data?.clientPrincipal || null);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  const signInUrl = '/.auth/login/github?post_login_redirect_uri=/';
  const signOutUrl = '/.auth/logout?post_logout_redirect_uri=/';

  return (
    <div className="auth-status">
      {loading ? (
        <span>🔐 Checking sign-in…</span>
      ) : me ? (
        <span>
          Signed in as <strong>{me.userDetails}</strong>
          {' '}(<code>{me.identityProvider}</code>) ·{' '}
          <a href={signOutUrl}>Sign out</a>
        </span>
      ) : (
        <span>
          Not signed in · <a href={signInUrl}>Sign in</a>
        </span>
      )}
      <button className="auth-refresh" type="button" onClick={loadMe} title="Refresh status">↻</button>
    </div>
  );
}
