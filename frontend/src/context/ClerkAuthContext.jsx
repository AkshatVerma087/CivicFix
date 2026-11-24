import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, getToken } from '@clerk/react';
import { AuthContext } from './authContextObject';
import { setAuthTokenGetter, setUnauthorizedHandler } from '../api/client';
import { usersAPI, toAppUser } from '../api/users';

// Clerk sign-in + the Go backend's /me for role and profile.
// isAuthenticated is true only once the user has finished onboarding.
export function ClerkAuthProvider({ children }) {
  // Wire the API client to Clerk once, before any child effect makes a request.
  useState(() => {
    setAuthTokenGetter(() => getToken());
    // A 401 surfaces as an error instead of redirecting: redirecting while Clerk
    // still says "signed in" would loop between /login and the dashboard.
    setUnauthorizedHandler(() => {});
  });

  const { isLoaded, isSignedIn, userId, signOut } = useClerkAuth();
  // { forUserId, status: 'loading' | 'ready' | 'error', me, error }.
  // While forUserId doesn't match the signed-in user, the user counts as loading.
  const [state, setState] = useState({ forUserId: null, status: 'loading', me: null, error: null });

  const fetchMe = useCallback((forUserId, isCancelled = () => false) =>
    usersAPI.getMe().then(
      (me) => { if (!isCancelled()) setState({ forUserId, status: 'ready', me, error: null }); },
      (error) => { if (!isCancelled()) setState({ forUserId, status: 'error', me: null, error }); },
    ), []);

  useEffect(() => {
    if (!(isLoaded && isSignedIn && userId)) return undefined;
    let cancelled = false;
    fetchMe(userId, () => cancelled);
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, userId, fetchMe]);

  const refreshUser = useCallback(() => {
    setState({ forUserId: userId, status: 'loading', me: null, error: null });
    return fetchMe(userId);
  }, [userId, fetchMe]);

  const current = isSignedIn && state.forUserId === userId ? state : null;
  const me = current?.status === 'ready' ? current.me : null;

  const onboard = useCallback(async (data) => {
    const result = await usersAPI.onboard(data);
    // The role claim in the session token comes from Clerk metadata; mint a fresh token.
    await getToken({ skipCache: true });
    setState({ forUserId: userId, status: 'ready', me: result, error: null });
    return toAppUser(result.user);
  }, [userId]);

  const logout = useCallback(() => {
    // Drop the cached user so signing back in (even as the same user) refetches it.
    setState({ forUserId: null, status: 'loading', me: null, error: null });
    return signOut({ redirectUrl: '/login' });
  }, [signOut]);

  const updateUserLocation = useCallback((location) => {
    setState((prev) => {
      if (!prev.me?.user?.authority) return prev;
      return {
        ...prev,
        me: { ...prev.me, user: { ...prev.me.user, authority: { ...prev.me.user.authority, location } } },
      };
    });
  }, []);

  const value = useMemo(() => {
    const user = me?.onboarded ? toAppUser(me.user) : null;
    return {
      user,
      isAuthenticated: !!user,
      isLoading: !isLoaded || (isSignedIn && (!current || current.status === 'loading')),
      needsOnboarding: !!me && !me.onboarded,
      adminEligible: !!me?.adminEligible,
      authError: current?.status === 'error' ? current.error : null,
      onboard,
      logout,
      updateUserLocation,
      refreshUser,
    };
  }, [me, current, isLoaded, isSignedIn, onboard, logout, updateUserLocation, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
