import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Accounting } from './pages/Accounting';
import { Invoicing } from './pages/Invoicing';
import { Diezmos } from './pages/Diezmos';
import { Members } from './pages/Members';
import { Reports } from './pages/Reports';
import { Support } from './pages/Support';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Onboarding } from './pages/Onboarding';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { SuperAdminLayout } from './components/superadmin/SuperAdminLayout';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { UserManagement } from './pages/superadmin/UserManagement';
import { Settings as SuperAdminSettings } from './pages/superadmin/Settings';

import { Billing } from './pages/superadmin/Billing';
import { Communications } from './pages/superadmin/Communications';
import { Reports as SuperAdminReports } from './pages/superadmin/Reports';
import { Support as SuperAdminSupport } from './pages/superadmin/Support';

import Renta from './pages/Renta';
import Exogenos from './pages/Exogenos';
import { FinancialStatementsWizard } from './components/accounting/FinancialStatementsWizard';

import { ToastContainer } from './components/ui/Toast';
import { GlobalConfirmModal } from './components/ui/GlobalConfirmModal';
import { useTheme } from './hooks/useTheme';

function App() {
  useTheme();
  return (
    <BrowserRouter>
      <ToastContainer />
      <GlobalConfirmModal />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="diezmos" element={<Diezmos />} />
            <Route path="accounting" element={<Accounting />} />
            <Route path="invoicing" element={<Invoicing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="renta" element={<Renta />} />
            <Route path="renta/:id" element={<Renta />} />
            <Route path="exogenos" element={<Exogenos />} />
            <Route path="financial-statements" element={<FinancialStatementsWizard />} />
            <Route path="support" element={<Support />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="/super-admin" element={<ProtectedRoute />}>
          <Route element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="users" element={<UserManagement />} />

            <Route path="billing" element={<Billing />} />
            <Route path="communications" element={<Communications />} />
            <Route path="reports" element={<SuperAdminReports />} />
            <Route path="support" element={<SuperAdminSupport />} />
            <Route path="settings" element={<SuperAdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
