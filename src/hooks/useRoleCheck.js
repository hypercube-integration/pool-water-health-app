import useAuth from './useAuth';

/**
 * useRoleCheck
 * Returns { has, roles } where:
 *  - has: boolean, true if the current user has ANY of the required roles
 *  - roles: string[] of the user's roles (from SWA)
 *
 * Example:
 *   const { has: canEdit } = useRoleCheck(['editor','admin']);
 */
export default function useRoleCheck(required = []) {
  const { user } = useAuth();
  const roles = user?.userRoles || [];
  if (!required.length) {
    return { has: !!user, roles };
  }
  const has = roles.some(r => required.includes(r));
  return { has, roles };
}
