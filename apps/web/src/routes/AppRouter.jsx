import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import LandingPage from '../pages/LandingPage/LandingPage';
import LoginPage from '../pages/LoginPage/LoginPage';
import RegisterPage from '../pages/RegisterPage/RegisterPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import WorkspacePage from '../pages/WorkspacePage/WorkspacePage';
import InvitationAcceptPage from '../pages/InvitationAcceptPage';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { WorkspaceProvider } from '../features/workspaces/WorkspaceContext';
import { FeedbackProvider } from '../components/common/Feedback/FeedbackContext';

function OAuthCallback() {
  const { refreshSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshSession().then((authenticated) => navigate(authenticated ? '/dashboard' : '/register?error=google_auth_failed', { replace: true }));
  }, [navigate, refreshSession]);

  return <main aria-live="polite">Completando inicio de sesión con Google…</main>;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  if (isAuthLoading) return <main aria-live="polite">Cargando sesión…</main>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRouter() {
  return (
    <AuthProvider>
      <FeedbackProvider>
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/invitations/accept" element={<InvitationAcceptPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
            <Route path="/workspace" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
      </FeedbackProvider>
    </AuthProvider>
  );
}

export default AppRouter;
