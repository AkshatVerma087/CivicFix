import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { IS_CLERK, CLERK_PUBLISHABLE_KEY, homePathForRole } from './config/auth';

import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage/LoginPage';
import ClerkAuthPage from './pages/ClerkAuthPage/ClerkAuthPage';
import OnboardingPage from './pages/OnboardingPage/OnboardingPage';
import CitizenDashboard from './pages/CitizenDashboard/CitizenDashboard';
import ReportIssuePage from './pages/ReportIssuePage/ReportIssuePage';
import PostDetailPage from './pages/PostDetailPage/PostDetailPage';
import AuthorityDashboard from './pages/AuthorityDashboard/AuthorityDashboard';
import NotificationsPage from './pages/NotificationsPage/NotificationsPage';
import MyPostsPage from './pages/MyPostsPage/MyPostsPage';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import MapView from './pages/MapView/MapView';
import AnalyticsPage from './pages/AnalyticsPage/AnalyticsPage';
import LeaderboardPage from './pages/LeaderboardPage/LeaderboardPage';
import './pages/ClerkAuthPage/ClerkAuthPage.css';

function FullPageStatus({ title, children }) {
  return (
    <div className="auth-status">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}

function AuthLoading() {
  return <FullPageStatus>Loading…</FullPageStatus>;
}

// Shown when Clerk says signed in but the backend can't load the user (backend down, wrong keys, CORS...).
function AuthErrorScreen() {
  const { authError, refreshUser, logout } = useAuth();
  return (
    <FullPageStatus title="Couldn't load your account">
      <p>{authError?.message || 'The server did not respond.'}</p>
      <div className="auth-status__actions">
        <button className="btn btn--primary" onClick={refreshUser}>Try again</button>
        <button className="btn" onClick={logout}>Sign out</button>
      </div>
    </FullPageStatus>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, needsOnboarding, authError } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (authError) return <AuthErrorScreen />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading, needsOnboarding, authError, user } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (authError) return <AuthErrorScreen />;
  if (isAuthenticated) return <Navigate to={homePathForRole(user?.role)} replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return children;
}

// Only for signed-in users who haven't picked a role yet.
function OnboardingRoute({ children }) {
  const { isAuthenticated, isLoading, needsOnboarding, authError, user } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (authError) return <AuthErrorScreen />;
  if (isAuthenticated) return <Navigate to={homePathForRole(user?.role)} replace />;
  return needsOnboarding ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      {IS_CLERK ? (
        <>
          <Route path="/login/*" element={<PublicRoute><ClerkAuthPage mode="sign-in" /></PublicRoute>} />
          <Route path="/sign-up/*" element={<PublicRoute><ClerkAuthPage mode="sign-up" /></PublicRoute>} />
          <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
        </>
      ) : (
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
      )}

      {/* Protected routes with sidebar layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<CitizenDashboard />} />
        <Route path="/report" element={<ReportIssuePage />} />
        <Route path="/post/:id" element={<PostDetailPage />} />
        <Route path="/my-posts" element={<MyPostsPage />} />
        <Route path="/authority" element={<AuthorityDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// Clerk needs react-router's navigate for its path routing, and follows the app theme.
function ClerkWithRouter({ children }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const light = theme === 'light';

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/login"
      signUpUrl="/sign-up"
      afterSignOutUrl="/login"
      appearance={{
        variables: {
          colorPrimary: '#6c5ce7',
          colorBackground: light ? '#ffffff' : '#1e1e2e',
          colorInputBackground: light ? '#f5f6fa' : '#16161f',
          colorText: light ? '#1a1a2e' : '#e4e4ef',
          colorTextSecondary: light ? '#5f6178' : '#9393a8',
          colorInputText: light ? '#1a1a2e' : '#e4e4ef',
          borderRadius: '10px',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

function MissingClerkKey() {
  return (
    <FullPageStatus title="Clerk is not configured">
      <p>
        <code>VITE_AUTH_PROVIDER=clerk</code> is set but <code>VITE_CLERK_PUBLISHABLE_KEY</code> is empty.
      </p>
      <p>Add the Publishable key (pk_test_…) to <code>frontend/.env</code> and restart <code>npm run dev</code>.</p>
    </FullPageStatus>
  );
}

export default function App() {
  if (IS_CLERK && !CLERK_PUBLISHABLE_KEY) {
    return <MissingClerkKey />;
  }

  const app = (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );

  return (
    <BrowserRouter>
      <ThemeProvider>
        {IS_CLERK ? <ClerkWithRouter>{app}</ClerkWithRouter> : app}
      </ThemeProvider>
    </BrowserRouter>
  );
}
