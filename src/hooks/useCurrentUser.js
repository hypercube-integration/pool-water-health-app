// BEGIN FILE: src/hooks/useCurrentUser.js
// PURPOSE: Standardize current-user info AND auto-bootstrap their profile once per session.
// RETURNS: { loading, user, roles }
//
// Drop-in replacement that's careful & minimal; it calls /.auth/me and then POST /api/profiles/bootstrap.

import { useEffect, useRef, useState } from "react";

export function useCurrentUser() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const bootstrapped = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/.auth/me", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;

        const entry = Array.isArray(data?.clientPrincipal) ? data.clientPrincipal[0] : data?.clientPrincipal;
        const normRoles = (entry?.userRoles || []).filter((r) => r !== "anonymous");
        setUser(entry || null);
        setRoles(normRoles);

        // Auto-bootstrap profile once per session if authenticated
        if (!bootstrapped.current && normRoles.includes("authenticated")) {
          bootstrapped.current = true;
          try {
            await fetch("/api/profiles/bootstrap", { method: "POST", credentials: "include" });
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setRoles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { loading, user, roles };
}
