// src/components/AuthStatus.jsx
import useAuth from '../hooks/useAuth';

export default function AuthStatus() {
  const { user, authLoading } = useAuth();
  const roles = user?.userRoles || [];
  const isAdmin = roles.includes('admin');

  return (
    <div className="auth-status">
      {authLoading ? (
        <span>Checking sign-in…</span>
      ) : user ? (
        <>
          <span>
            Signed in as <strong>{user?.userDetails || 'user'}</strong>{' '}
            <span style={{ opacity: 0.7 }}>(github)</span>
          </span>
          {/* Show Admin link to all signed-in users; the Admin page gatekeeps the role */}
          <a className="chip" href="/#/admin" title={isAdmin ? 'Admin' : 'Admin (requires admin role)'}>Admin</a>
          <a className="chip danger" href="/.auth/logout?post_logout_redirect_uri=/signed-out">Sign out</a>
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
