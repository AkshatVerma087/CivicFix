import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage/LoginPage';
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

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    const dest = user?.role === 'admin' ? '/admin' : user?.role === 'authority' ? '/authority' : '/dashboard';
    return <Navigate to={dest} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

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

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
