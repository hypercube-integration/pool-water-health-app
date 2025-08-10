// src/components/AuthStatus.jsx
import useAuth from '../hooks/useAuth';

export default function AuthStatus() {
  const { user, authLoading } = useAuth();

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
          <a className="chip danger" href="/.auth/logout?post_logout_redirect_uri=/signed-out">
            Sign out
          </a>
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
