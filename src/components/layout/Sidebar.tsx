import { NavLink, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/db';
import {
    LayoutDashboard,
    Users,
    Heart,
    Calculator,
    BarChart3,
    Settings,
    LogOut,
    Church,
    Receipt,
    Building2,
    FileSignature,
    FileDown,
    FileText,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { signOut, profile } = useAuthStore();
    const organization = useLiveQuery(async () => {
        if (profile?.organizationId) {
            const org = await db.organizations.get(profile.organizationId);
            if (org) return org;
        }
        return db.organizations.toArray().then(orgs => orgs[0]);
    }, [profile?.organizationId]);

    const navigate = useNavigate();

    // Determine type from local DB or profile fallback
    const orgType = organization?.type || profile?.organizationType;
    const isCompany = orgType === 'EMPRESA';

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const navigation: Array<{
        name: string;
        href: string;
        icon: typeof LayoutDashboard;
        id: string;
        hidden?: boolean;
    }> = [
            { name: 'Inicio', href: '/', icon: LayoutDashboard, id: 'dashboard' },
            {
                name: 'Facturación',
                href: '/invoicing',
                icon: Receipt,
                id: 'invoicing'
            },
            {
                name: 'Contabilidad',
                href: '/accounting',
                icon: Calculator,
                id: 'accounting'
            },
            {
                name: 'Miembros',
                href: '/members',
                icon: Users,
                id: 'members',
                hidden: isCompany
            },
            {
                name: 'Diezmos',
                href: '/diezmos',
                icon: Heart,
                id: 'contributions',
                hidden: isCompany
            },
            {
                name: 'Impuesto Renta',
                href: '/renta',
                icon: FileSignature,
                id: 'renta'
            },
            {
                name: 'Reportes Exógenos',
                href: '/exogenos',
                icon: FileDown,
                id: 'exogenos'
            },
            {
                name: 'Estados Financieros',
                href: '/financial-statements',
                icon: FileText,
                id: 'financial_statements'
            },
            {
                name: 'Reportes',
                href: '/reports',
                icon: BarChart3,
                id: 'reports'
            },
            {
                name: 'Configuración',
                href: '/settings',
                icon: Settings,
                id: 'settings'
            },
        ];

    const filteredNavigation = navigation.filter(item => {
        // 1. Existing hidden check (used for church vs company logic)
        if (item.hidden) return false;

        // 2. Organization Settings Check (Global switch for the whole org)
        const orgModules = (organization?.settings as any)?.modules;
        if (orgModules && orgModules[item.id] === false) return false;

        // 3. User Permissions Check
        // Super Admin bypasses permission checks
        if (profile?.role === 'SUPER_ADMIN') return true;

        // Core modules that should always be visible
        if (item.id === 'dashboard' || item.id === 'settings') return true;

        const userModules = profile?.allowedModules;
        if (userModules && userModules[item.id] === false) return false;

        return true;
    });

    const formatRole = (role: string) => {
        const map: Record<string, string> = {
            'SUPER_ADMIN': 'Superadmin',
            'ADMIN': 'Admin',
            'ACCOUNTANT': 'Contador',
            'TREASURER': 'Tesorero',
            'AUDITOR': 'Auditor',
            'BASIC': 'Support'
        };
        return map[role] || role;
    };

    return (
        <aside className={cn(
            "w-64 bg-card border-r border-border flex flex-col fixed h-full z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-xl shadow-slate-200/50 dark:shadow-none",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 group transition-all duration-300">
                        <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
                            <LayoutDashboard className="size-5" />
                        </div>
                        <div>
                            <h1 className="font-black text-2xl tracking-tighter text-foreground leading-none">Cifrix</h1>
                            <p className="text-[10px] font-bold text-primary mt-1 opacity-90">Contabilidad inteligente</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="md:hidden p-2 hover:bg-accent hover:text-accent-foreground rounded-lg text-muted-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Org Info Widget - Premium Glassmorphism Look */}
                <div className="relative group overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 blur-xl group-hover:bg-primary/10 transition-colors rounded-3xl" />
                    <div className="relative bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm transition-all duration-300 group-hover:border-primary/30">
                        <div className="flex items-start gap-4">
                            <div className="size-10 rounded-2xl bg-background flex items-center justify-center shadow-lg shadow-slate-200/50 dark:shadow-none text-primary mt-1 shrink-0 border border-border">
                                {orgType === 'IGLESIA' ? <Church className="size-6" /> : <Building2 className="size-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-muted-foreground leading-none mb-1.5 flex items-center gap-1.5">
                                    <span className="size-1 rounded-full bg-primary animate-pulse" />
                                    Organización
                                </p>
                                <p className="text-xs font-bold text-foreground break-words leading-tight capitalize">
                                    {organization?.name?.toLowerCase() || 'Cargando...'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                <p className="px-3 text-[10px] font-bold text-muted-foreground tracking-wide mb-4 mt-2 border-l-2 border-primary/30 ml-3">Menú principal</p>
                {filteredNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => window.innerWidth < 768 && onClose()}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-blue-600/20"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={cn(
                                        "size-5 transition-transform duration-200 group-hover:scale-110",
                                        isActive ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : ""
                                    )} />
                                    <span className="text-sm font-bold">{item.name}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 p-4 rounded-2xl shadow-lg relative overflow-hidden group border border-slate-700/50">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/10 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-colors"></div>

                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="size-10 rounded-xl bg-slate-700/50 flex items-center justify-center border border-slate-600/50 shadow-inner">
                            <Users className="size-5 text-slate-300" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <p className="text-sm font-black truncate text-white">
                                {profile?.full_name?.split(' ')[0] || 'Usuario'}
                            </p>
                            <p className="text-[10px] font-bold text-blue-400 tracking-wide">
                                {profile?.role ? formatRole(profile.role) : 'Administrador'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-2.5 rounded-xl transition-all text-xs font-black text-slate-200 hover:text-white border border-white/10 relative z-10 active:scale-95"
                    >
                        <LogOut className="size-4" />
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </aside>
    );
}
