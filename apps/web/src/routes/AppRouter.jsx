import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage/LandingPage';
import LoginPage from '../pages/LoginPage/LoginPage';
import RegisterPage from '../pages/RegisterPage/RegisterPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import WorkspacePage from '../pages/WorkspacePage/WorkspacePage';
import { AuthProvider } from '../features/auth/AuthContext';
import { WorkspaceProvider } from '../features/workspaces/WorkspaceContext';

function AppRouter() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/app" element={<WorkspacePage />} />
            <Route path="/workspace" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default AppRouter;
