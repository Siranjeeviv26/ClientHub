import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useOrganization } from "./contexts/OrganizationContext";
import { MainLayout } from "./layouts/MainLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
const RolesPage = lazy(() =>
  import("./features/roles/RolesPage").then((m) => ({ default: m.RolesPage })),
);
const ClientDetailPage = lazy(() =>
  import("./features/clients/ClientDetailPage").then((m) => ({ default: m.ClientDetailPage })),
);
const LeadDetailPage = lazy(() =>
  import("./features/leads/LeadDetailPage").then((m) => ({ default: m.LeadDetailPage })),
);
const DealDetailPage = lazy(() =>
  import("./features/deals/DealDetailPage").then((m) => ({ default: m.DealDetailPage })),
);
const TaskDetailPage = lazy(() =>
  import("./features/tasks/TaskDetailPage").then((m) => ({ default: m.TaskDetailPage })),
);
const OrganizationsPage = lazy(() =>
  import("./features/organizations/OrganizationsPage").then((m) => ({
    default: m.OrganizationsPage,
  })),
);
const DocumentsPage = lazy(() =>
  import("./features/documents/DocumentsPage").then((m) => ({
    default: m.DocumentsPage,
  })),
);
const CalendarPage = lazy(() =>
  import("./features/calendar/CalendarPage").then((m) => ({
    default: m.CalendarPage,
  })),
);
const CommunicationsPage = lazy(() =>
  import("./features/communications/CommunicationsPage").then((m) => ({
    default: m.CommunicationsPage,
  })),
);
const ProposalsPage = lazy(() =>
  import("./features/proposals/ProposalsPage").then((m) => ({
    default: m.ProposalsPage,
  })),
);
const InvoicesPage = lazy(() =>
  import("./features/invoices/InvoicesPage").then((m) => ({
    default: m.InvoicesPage,
  })),
);
const PaymentsPage = lazy(() =>
  import("./features/payments/PaymentsPage").then((m) => ({
    default: m.PaymentsPage,
  })),
);
const ReportsPage = lazy(() =>
  import("./features/reports/ReportsPage").then((m) => ({
    default: m.default,
  })),
);
const AuditLogsPage = lazy(() =>
  import("./features/audit-logs/AuditLogsPage").then((m) => ({
    default: m.AuditLogsPage,
  })),
);
const SubscriptionPage = lazy(() =>
  import("./features/billing/SubscriptionPage").then((m) => ({
    default: m.default,
  })),
);
const OrganizationSettings = lazy(() =>
  import("./features/settings/OrganizationSettings").then((m) => ({
    default: m.OrganizationSettings,
  })),
);
const SuperAdminLayout = lazy(() =>
  import("./features/super-admin/SuperAdminLayout").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminDashboard = lazy(() =>
  import("./features/super-admin/SuperAdminDashboard").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminOrganizations = lazy(() =>
  import("./features/super-admin/OrganizationsPage").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminUsers = lazy(() =>
  import("./features/super-admin/UsersPage").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminSubscriptions = lazy(() =>
  import("./features/super-admin/SubscriptionsPage").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminPlans = lazy(() =>
  import("./features/super-admin/PlansPage").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminAuditLogs = lazy(() =>
  import("./features/super-admin/AuditLogsPage").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminPayments = lazy(() =>
  import("./features/super-admin/PaymentsPage").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminPlatformAnalytics = lazy(() =>
  import("./features/super-admin/PlatformAnalyticsPage").then((m) => ({
    default: m.default,
  })),
);
const SuperAdminSystemSettings = lazy(() =>
  import("./features/super-admin/SystemSettingsPage").then((m) => ({
    default: m.default,
  })),
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
  const { isAuthenticated, isLoading, user } = useAuth();

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

  if (user?.role === 'SUPER_ADMIN' && window.location.pathname !== '/admin' && !window.location.pathname.startsWith('/admin/')) {
    return <Navigate to="/admin" replace />;
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

function RoleRoute({ allowed }: { allowed: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || !allowed.includes(user.role as string)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                <LoginPage />
              </Suspense>
            } />
            <Route path="/register" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                <RegisterPage />
              </Suspense>
            } />
            <Route path="/forgot-password" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                <ForgotPasswordPage />
              </Suspense>
            } />
            <Route path="/reset-password" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                <ResetPasswordPage />
              </Suspense>
            } />
            <Route path="/verify-email" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                <VerifyEmailPage />
              </Suspense>
            } />
          </Route>
        </Route>

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route
              path="/settings"
              element={
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/settings/organizations"
              element={
                <ErrorBoundary>
                  <OrganizationsPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/settings/:section"
              element={
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              }
            />
            <Route element={<OrganizationRoute />}>
              <Route
                path="/"
                element={
                  <ErrorBoundary>
                    <DashboardPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/clients"
                element={
                  <ErrorBoundary>
                    <ClientsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/clients/:id"
                element={
                  <ErrorBoundary>
                    <ClientDetailPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/leads"
                element={
                  <ErrorBoundary>
                    <LeadsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/leads/:id"
                element={
                  <ErrorBoundary>
                    <LeadDetailPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/deals"
                element={
                  <ErrorBoundary>
                    <DealsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/deals/:id"
                element={
                  <ErrorBoundary>
                    <DealDetailPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ErrorBoundary>
                    <TasksPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/tasks/:id"
                element={
                  <ErrorBoundary>
                    <TaskDetailPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/activities"
                element={
                  <ErrorBoundary>
                    <ActivitiesPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/activities/:id"
                element={
                  <ErrorBoundary>
                    <ActivitiesPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/communications"
                element={
                  <ErrorBoundary>
                    <CommunicationsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/proposals"
                element={
                  <ErrorBoundary>
                    <ProposalsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ErrorBoundary>
                    <InvoicesPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/payments"
                element={
                  <ErrorBoundary>
                    <PaymentsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ErrorBoundary>
                    <CalendarPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/documents"
                element={
                  <ErrorBoundary>
                    <DocumentsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ErrorBoundary>
                    <NotificationsPage />
                  </ErrorBoundary>
                }
              />
              <Route element={<RoleRoute allowed={['ADMIN', 'MANAGER']} />}>
                <Route
                  path="/users"
                  element={
                    <ErrorBoundary>
                      <UsersPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <ErrorBoundary>
                      <RolesPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ErrorBoundary>
                      <ReportsPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <ErrorBoundary>
                      <AuditLogsPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/settings/subscription"
                  element={
                    <ErrorBoundary>
                      <SubscriptionPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/settings/organization"
                  element={
                    <ErrorBoundary>
                      <OrganizationSettings />
                    </ErrorBoundary>
                  }
                />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* Super Admin Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowed={['SUPER_ADMIN']} />}>
            <Route path="/admin" element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                <SuperAdminLayout />
              </Suspense>
            }>
              <Route index element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminDashboard />
                </Suspense>
              } />
              <Route path="organizations" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminOrganizations />
                </Suspense>
              } />
              <Route path="users" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminUsers />
                </Suspense>
              } />
              <Route path="subscriptions" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminSubscriptions />
                </Suspense>
              } />
              <Route path="plans" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminPlans />
                </Suspense>
              } />
              <Route path="audit-logs" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminAuditLogs />
                </Suspense>
              } />
              <Route path="payments" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminPayments />
                </Suspense>
              } />
              <Route path="analytics" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminPlatformAnalytics />
                </Suspense>
              } />
              <Route path="settings" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                  <SuperAdminSystemSettings />
                </Suspense>
              } />
            </Route>
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
