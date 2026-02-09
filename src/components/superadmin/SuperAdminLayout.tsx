import { Outlet } from 'react-router-dom';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { SuperAdminHeader } from './SuperAdminHeader';

export function SuperAdminLayout() {
  return (
    <div className="bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 min-h-screen flex font-sans relative">
      {/* Texture Layer: Premium Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden dark:block">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(37,99,235,0.08),_transparent_50%)]"></div>
      </div>

      <SuperAdminSidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col relative z-10">
        <SuperAdminHeader />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
