import { useEffect, useState } from 'react';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await fetch('/.auth/me', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        setUser(data?.clientPrincipal || null);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    fetchAuth();
  }, []);

  return { user, authLoading };
}