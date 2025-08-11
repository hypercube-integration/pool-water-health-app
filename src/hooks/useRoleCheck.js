// src/hooks/useRoleCheck.js
import useAuth from './useAuth';

export default function useRoleCheck(required = []) {
  const { user, staleOffline } = useAuth();
  const roles = (user?.userRoles || []).map(r => String(r).trim().toLowerCase());

  if (!required.length) return { has: !!user, roles, staleOffline };
  return { has: !!user && roles.some(r => required.map(x => x.toLowerCase()).includes(r)), roles, staleOffline };
}
