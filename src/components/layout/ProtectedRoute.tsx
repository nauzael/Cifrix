import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
  const { user, profile, loading, initialize } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // SuperAdmin should always have access, but check profile role
  // If user has no organization and is NOT a super admin, force onboarding
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN' || user.email === 'superadmin@cifrix.com';
  
  if (!isSuperAdmin && !profile?.organizationId && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If user HAS organization (or is superadmin) but tries to go to onboarding, redirect to dashboard
  if ((profile?.organizationId || isSuperAdmin) && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
