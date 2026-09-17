import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage/LandingPage';
import LoginPage from '../pages/LoginPage/LoginPage';
import RegisterPage from '../pages/RegisterPage/RegisterPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import WorkspacePage from '../pages/WorkspacePage/WorkspacePage';
import InvitationAcceptPage from '../pages/InvitationAcceptPage';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { WorkspaceProvider } from '../features/workspaces/WorkspaceContext';
import { FeedbackProvider } from '../components/common/Feedback/FeedbackContext';
import ErrorPage from '../pages/ErrorPage';

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
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invitations/accept" element={<InvitationAcceptPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
            <Route path="/workspace" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </WorkspaceProvider>
      </FeedbackProvider>
    </AuthProvider>
  );
}
export default AppRouter;
