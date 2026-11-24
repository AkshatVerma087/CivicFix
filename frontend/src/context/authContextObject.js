import { createContext } from 'react';

// Shared by the legacy and Clerk providers so useAuth() works with either.
// Value: { user, isAuthenticated, isLoading, needsOnboarding, adminEligible, authError,
//          login, onboard, logout, updateUserLocation, refreshUser }
export const AuthContext = createContext(null);
