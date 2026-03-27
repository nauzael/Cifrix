import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  role: string;
  organizationId: string | null;
  organizationName: string | null;
  organizationType: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  address?: string | null;
  job_title?: string | null;
  allowedModules?: Record<string, boolean>;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean; // Añadido a la interface
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setOrganizationId: (orgId: string | null) => void;
  isOfflineMode: () => boolean; // Nueva función para detectar modo offline
}

// Helper to fetch profile
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // Perfil por defecto
  const finalProfile: UserProfile = {
    role: 'USER',
    organizationId: null,
    organizationName: null,
    organizationType: null,
    allowedModules: {} // Inicializar vacío
  };

  try {
    // 0. INTENTO DE BOOTSTRAP SEGURO (RPC) - La vía más rápida y segura
    try {
      const { data: bootstrapData, error: bootstrapError } = await (supabase as any).rpc('get_my_complete_profile');

      if (!bootstrapError && bootstrapData) {
        finalProfile.role = bootstrapData.role || 'USER';
        finalProfile.organizationId = bootstrapData.organization_id;
        finalProfile.organizationName = bootstrapData.organization_name;
        finalProfile.organizationType = bootstrapData.organization_type;

        const orgSettings = bootstrapData.org_settings || {};
        const orgModules = orgSettings.modules || {};

        if (bootstrapData.module_permissions) {
          const permissions = bootstrapData.module_permissions as Record<string, any>;
          for (const [moduleName, modulePerms] of Object.entries(permissions)) {
            if (typeof modulePerms === 'object' && modulePerms !== null) {
              // Si no tiene acceso de lectura o el módulo está desactivado en la org, es false
              const userHasAccess = modulePerms.read === true;
              const orgHasModule = orgModules[moduleName] !== false;
              finalProfile.allowedModules![moduleName] = (userHasAccess && orgHasModule);
            }
          }
        }

        // Recuperar datos personales en paralelo sin bloquear
        supabase.from('profiles').select('full_name, avatar_url, phone, address, job_title').eq('id', userId).maybeSingle()
          .then(({ data }) => {
            if (data) Object.assign(finalProfile, data);
          });

        return finalProfile;
      }
    } catch (e) {
      console.warn('Bootstrap RPC failed/missing, falling back to standard query...', e);
    }

    // 1. OBTENER DEFINICIONES DE ROL Y ORG (Método Legacy / Fallback)
    try {
      const { data: userOrgData, error: userOrgError } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          status,
          module_permissions,
          role_id,
          roles!inner (code, name, level),
          organizations!inner (name, type, settings)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!userOrgError && userOrgData) {
        finalProfile.role = userOrgData.roles?.code || 'USER';
        finalProfile.organizationId = userOrgData.organization_id;
        finalProfile.organizationName = userOrgData.organizations?.name || 'Organización';
        finalProfile.organizationType = userOrgData.organizations?.type || null;

        const orgSettings = (userOrgData.organizations?.settings as any) || {};
        const orgModules = orgSettings.modules || {};

        if (userOrgData.module_permissions) {
          const permissions = userOrgData.module_permissions as Record<string, any>;
          for (const [moduleName, modulePerms] of Object.entries(permissions)) {
            if (typeof modulePerms === 'object' && modulePerms !== null) {
              const userHasAccess = modulePerms.read === true;
              const orgHasModule = orgModules[moduleName] !== false;
              finalProfile.allowedModules![moduleName] = (userHasAccess && orgHasModule);
            } else {
              // Si modulePerms no es un objeto válido, asumimos que no tiene acceso
              finalProfile.allowedModules![moduleName] = false;
            }
          }
        }
      } else {
        // ESTRATEGIA DE RECUPERACIÓN (FALLBACK READ)
        console.warn('Consulta principal falló, intentando recuperación simple...');

        const { data: simpleLink } = await supabase
          .from('user_organizations')
          .select('organization_id, role_id, module_permissions')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (simpleLink) {
          finalProfile.organizationId = simpleLink.organization_id;

          const { data: orgData } = await supabase
            .from('organizations')
            .select('name, type')
            .eq('id', simpleLink.organization_id)
            .maybeSingle();

          if (orgData) {
            finalProfile.organizationName = orgData.name;
            finalProfile.organizationType = orgData.type;
          }

          const { data: roleData } = await supabase
            .from('roles')
            .select('code')
            .eq('id', simpleLink.role_id)
            .maybeSingle();

          if (roleData) finalProfile.role = roleData.code;
        }
      }
    } catch (orgErr) {
      console.warn('⚠️ Error fetching user organization (non-fatal):', orgErr);
    }

    // 2. OBTENER DATOS PERSONALES (No crítico)
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, phone, address, job_title')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        finalProfile.full_name = profileData.full_name;
        finalProfile.avatar_url = profileData.avatar_url;
        finalProfile.phone = profileData.phone;
        finalProfile.address = profileData.address;
        finalProfile.job_title = profileData.job_title;
      }
    } catch (profileErr) {
      console.warn('⚠️ Error fetching personal profile data:', profileErr);
    }

    // 3. CHECK SUPER ADMIN - LA VERIFICACIÓN DEFINITIVA
    try {
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
        p_user_id: userId
      });

      if (isSuperAdmin) {
        finalProfile.role = 'SUPER_ADMIN';
        
        // Super Admin Override from localStorage if present
        const savedOrgId = localStorage.getItem('super_admin_active_org');
        
        if (savedOrgId) {
          try {
            const { data: targetOrg } = await supabase
              .from('organizations')
              .select('id, name, type, settings')
              .eq('id', savedOrgId)
              .maybeSingle();

            if (targetOrg) {
              finalProfile.organizationId = targetOrg.id;
              finalProfile.organizationName = targetOrg.name;
              finalProfile.organizationType = targetOrg.type;
              const orgSettings = (targetOrg.settings as any) || {};
              const orgModules = orgSettings.modules || {};
              if (finalProfile.allowedModules) {
                Object.keys(finalProfile.allowedModules).forEach(m => {
                  if (orgModules[m] !== false) finalProfile.allowedModules![m] = true;
                });
              }
            }
          } catch (err) {
            console.warn('Error loading super admin override org:', err);
          }
        }

        if (!finalProfile.organizationId) {
          try {
            const { data: anyOrg } = await supabase
              .from('organizations')
              .select('id, name, type, settings')
              .limit(1)
              .maybeSingle();

            if (anyOrg) {
              finalProfile.organizationId = anyOrg.id;
              finalProfile.organizationName = anyOrg.name;
              finalProfile.organizationType = anyOrg.type;
              const orgSettings = (anyOrg.settings as any) || {};
              const orgModules = orgSettings.modules || {};
              if (finalProfile.allowedModules) {
                for (const moduleName of Object.keys(finalProfile.allowedModules)) {
                  if (orgModules[moduleName] !== false) {
                    finalProfile.allowedModules[moduleName] = true;
                  }
                }
              }
            } else {
              finalProfile.organizationName = 'Sistema Global';
            }
          } catch (err) {
            console.warn('Error fetching default org for super admin:', err);
            finalProfile.organizationName = 'Sistema Global';
          }
        }
      }
    } catch (rpcErr) {
      console.warn('⚠️ Could not check super admin status:', rpcErr);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'admin@cifrix.com' || user?.email === 'superadmin@cifrix.com') {
        finalProfile.role = 'SUPER_ADMIN';
      }
    }

    return finalProfile;

  } catch (e) {
    console.error('Fatal exception fetching profile:', e);
    return finalProfile;
  }
}

// Variable para controlar que el listener solo se registre una vez
let authListenerRegistered = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    // Prevent multiple initializations
    if (get().initialized) return;

    try {
      // 1. Get initial session from storage
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        set({ user: null, profile: null, loading: false, initialized: true });
        return;
      }

      if (session?.user) {
        console.log('✅ Sesión recuperada para:', session.user.email);
        const profile = await fetchUserProfile(session.user.id);
        set({ user: session.user, profile, loading: false, initialized: true });
      } else {
        console.log('ℹ️ No hay sesión activa');
        set({ user: null, profile: null, loading: false, initialized: true });
      }
    } catch (e) {
      console.error('Auth initialization error:', e);
      set({ user: null, profile: null, loading: false, initialized: true });
    }

    // 2. Register auth listener ONCE
    if (!authListenerRegistered) {
      authListenerRegistered = true;

      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);

        // Handle different events
        switch (event) {
          case 'SIGNED_OUT':
            set({ user: null, profile: null, loading: false });
            break;

          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              const currentUser = get().user;
              // Only fetch profile if user changed
              if (currentUser?.id !== session.user.id) {
                const profile = await fetchUserProfile(session.user.id);
                set({ user: session.user, profile, loading: false });
              } else {
                // Just update user reference for token refresh
                set({ user: session.user });
              }
            }
            break;

          case 'INITIAL_SESSION':
            // Initial session is already handled in initialize()
            // Only update if we don't have a user yet
            if (!get().user && session?.user) {
              const profile = await fetchUserProfile(session.user.id);
              set({ user: session.user, profile, loading: false });
            }
            break;

          case 'USER_UPDATED':
            if (session?.user) {
              set({ user: session.user });
            }
            break;
        }
      });
    }
  },

  setUser: (user) => {
    set({ user });
  },

  signOut: async () => {
    try {
      localStorage.removeItem('super_admin_active_org');
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    }
    set({ user: null, profile: null, initialized: false });
  },

  refreshProfile: async () => {
    const user = get().user;
    if (user) {
      const profile = await fetchUserProfile(user.id);
      set({ profile });
    }
  },

  setOrganizationId: (orgId: string | null) => {
    const profile = get().profile;
    if (profile && profile.role === 'SUPER_ADMIN') {
      if (orgId) {
        localStorage.setItem('super_admin_active_org', orgId);
      } else {
        localStorage.removeItem('super_admin_active_org');
      }
      set({ profile: { ...profile, organizationId: orgId } });
    }
  },

  isOfflineMode: () => {
    const user = get().user;
    return (user as any)?.isOffline === true;
  }
}));
