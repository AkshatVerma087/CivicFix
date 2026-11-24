// Which login system the app uses.
//   legacy: email/password against the Node backend (default, current production)
//   clerk:  Clerk sign-in against the Go backend (set VITE_API_URL to the Go API too)
export const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER === 'clerk' ? 'clerk' : 'legacy';

export const IS_CLERK = AUTH_PROVIDER === 'clerk';

export const CLERK_PUBLISHABLE_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();

// Where each role lands after signing in.
export function homePathForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'authority') return '/authority';
  return '/dashboard';
}
