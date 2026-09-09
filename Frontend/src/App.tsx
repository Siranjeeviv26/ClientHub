import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useOrganization } from "./contexts/OrganizationContext";
import { MainLayout } from "./layouts/MainLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

// Lazy load pages for code splitting
const DashboardPage = lazy(() =>
  import("./features/dashboard/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  })),
);
const ClientsPage = lazy(() =>
  import("./features/clients/ClientsPage").then((m) => ({
    default: m.ClientsPage,
  })),
);
const LeadsPage = lazy(() =>
  import("./features/leads/LeadsPage").then((m) => ({ default: m.LeadsPage })),
);
const DealsPage = lazy(() =>
  import("./features/deals/DealsPage").then((m) => ({ default: m.DealsPage })),
);
const TasksPage = lazy(() =>
  import("./features/tasks/TasksPage").then((m) => ({ default: m.TasksPage })),
);
const ActivitiesPage = lazy(() =>
  import("./features/activities/ActivitiesPage").then((m) => ({
    default: m.ActivitiesPage,
  })),
);
const NotificationsPage = lazy(() =>
  import("./features/notifications/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const UsersPage = lazy(() =>
  import("./features/users/UsersPage").then((m) => ({ default: m.UsersPage })),
);

const LoginPage = lazy(() =>
  import("./features/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("./features/auth/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./features/auth/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./features/auth/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./features/auth/VerifyEmailPage").then((m) => ({
    default: m.VerifyEmailPage,
  })),
);

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function OrganizationRoute() {
  const { organization, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!organization) {
    return <Navigate to="/settings/organization" replace />;
  }

  return <Outlet />;
}

function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>
        </Route>

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route element={<OrganizationRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
