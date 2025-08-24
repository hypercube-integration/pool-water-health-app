// BEGIN FILE: src/hooks/useCurrentUser.js
// VERSION: 2025-08-24
// NOTES: Reads live roles from Azure Static Web Apps EasyAuth (/.auth/me).

import { useEffect, useState } from "react";

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/.auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to read /.auth/me");
        const data = await res.json();
        const cp = data?.clientPrincipal || null;
        if (!cancelled) {
          if (cp) {
            const roles =
              (cp.userRoles || []).filter((r) => r !== "anonymous" && r !== "authenticated") || [];
            setUser({
              userId: cp.userId,
              userDetails: cp.userDetails, // usually email/UPN
              identityProvider: cp.identityProvider,
              roles,
            });
          } else {
            setUser(null);
          }
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, roles: user?.roles || [], isAuthenticated: !!user, loading };
}
