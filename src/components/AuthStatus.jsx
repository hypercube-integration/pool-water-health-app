// src/components/AuthStatus.jsx
import useAuth, { clearAuthCache } from '../hooks/useAuth';

export default function AuthStatus() {
  const { user, authLoading, staleOffline } = useAuth();
  const roles = user?.userRoles || [];
  const isSignedIn = !!user;

  const doSignOut = () => {
    // Only clear client cache after redirecting to logout (when online)
    clearAuthCache();
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/signed-out';
  };

  return (
    <div className="auth-status">
      {authLoading ? (
        <span>Checking sign-in…</span>
      ) : isSignedIn ? (
        <>
          <span>
            {staleOffline ? 'Signed in (offline) as ' : 'Signed in as ' }
            <strong>{user?.userDetails || 'user'}</strong>
            <span style={{ opacity: 0.7 }}> ({user?.identityProvider || 'github'})</span>
          </span>
          <a className="chip" href="/#/">Dashboard</a>
          <a className="chip" href="/#/admin">Admin</a>
          <button className="chip danger" onClick={doSignOut} disabled={staleOffline} title={staleOffline ? 'Go online to fully sign out' : 'Sign out'}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <span>Not signed in</span>
          <a className="chip" href="/.auth/login/github?post_login_redirect_uri=/">Sign in</a>
        </>
      )}
    </div>
  );
}
