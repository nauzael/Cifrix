import { Outlet } from 'react-router-dom';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { SuperAdminHeader } from './SuperAdminHeader';

export function SuperAdminLayout() {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex font-sans">
      <SuperAdminSidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <SuperAdminHeader />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
