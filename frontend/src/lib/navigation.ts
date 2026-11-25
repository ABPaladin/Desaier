import type { Role } from '@/lib/contracts';

// The only account fields serialized into the public shell.
export type NavigationUser = { name: string; role: Role };
export type NavigationIdentity = { user: NavigationUser | null; unavailable?: boolean };
export function dashboardHref(user: NavigationUser | null) {
  return user ? `/dashboard/${user.role}` : '/dashboard';
}
export function projectAction(user: NavigationUser | null) {
  return { href: dashboardHref(user), label: user?.role === 'operator' ? 'Manage projects' : user?.role === 'designer' ? 'My projects' : 'Start a project' };
}
export function initials(name: string) {
  return name.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase() || 'D';
}
