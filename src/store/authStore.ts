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
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Helper to fetch profile
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
    // 1. OBTENER DEFINICIONES DE ROL Y ORG (Puede fallar si no tiene org, pero seguimos)
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

        // Obtener configuración global de módulos de la organización
        const orgSettings = (userOrgData.organizations?.settings as any) || {};
        const orgModules = orgSettings.modules || {};

        // Procesar permisos combinados (Usuario + Organización)
        if (userOrgData.module_permissions) {
          const permissions = userOrgData.module_permissions as Record<string, any>;
          for (const [moduleName, modulePerms] of Object.entries(permissions)) {
            if (typeof modulePerms === 'object' && modulePerms !== null) {
              const userHasAccess = modulePerms.read === true;
              const orgHasModule = orgModules[moduleName] !== false;

              if (userHasAccess && orgHasModule) {
                finalProfile.allowedModules![moduleName] = true;
              }
            }
          }
        }
      } else {
        // ESTRATEGIA DE RECUPERACIÓN (FALLBACK READ)
        // Si falló el JOIN (probablemente por RLS en organizations o roles), intentamos leer simple
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

          // Intentar recuperar nombre de org por separado
          const { data: orgData } = await supabase
            .from('organizations')
            .select('name, type')
            .eq('id', simpleLink.organization_id)
            .maybeSingle();

          if (orgData) {
            finalProfile.organizationName = orgData.name;
            finalProfile.organizationType = orgData.type;
          }

          // Intentar recuperar rol
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
    // Incluso si lo anterior falló, esto puede conceder acceso total
    try {
      // Usamos la RPC segura que creamos/verificamos
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
        p_user_id: userId
      });

      if (isSuperAdmin) {
        finalProfile.role = 'SUPER_ADMIN';
        // Si no tiene organización asignada explícitamente, buscamos una por defecto para evitar bloqueos
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
              // También cargar settings para evitar bloqueos de permisos
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
      // Fallback: Si el email es el del superadmin, forzar rol
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'admin@cifrix.com' || user?.email === 'superadmin@cifrix.com') {
        finalProfile.role = 'SUPER_ADMIN';
      }
    }

    // console.log('✅ Profile loaded successfully:', finalProfile);
    return finalProfile;

  } catch (e) {
    console.error('Fatal exception fetching profile:', e);
    return finalProfile; // Retornar lo que tengamos en lugar de null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialize: async () => {
    try {
      // 1. Get initial session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        set({ user: session.user, profile, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    } catch (e) {
      set({ user: null, profile: null, loading: false });
    }

    // 2. Listen for changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = get().user;

      if (session?.user) {
        // If user changed or no profile yet, fetch it
        if (currentUser?.id !== session.user.id || !get().profile) {
          const profile = await fetchUserProfile(session.user.id);
          set({ user: session.user, profile, loading: false });
        } else {
          // Just update user object (e.g. token refresh), keep profile
          set({ user: session.user, loading: false });
        }
      } else if (_event === 'SIGNED_OUT') {
        // SOLO cerrar sesión si el evento es explícitamente SIGNED_OUT
        // Esto evita que errores de red o parpadeos de conexión (donde session es null)
        // causen un logout indeseado.
        console.log('🛑 Usuario cerró sesión explícitamente');
        set({ user: null, profile: null, loading: false });
      } else {
        // En cualquier otro caso donde session sea null pero NO sea logout (ej: error de red),
        // MANTENEMOS la sesión actual si existe.
        console.warn(`⚠️ Evento de Auth ${_event} recibido sin sesión. Ignorando para evitar logout accidental.`);
        // No limpiamos el usuario aquí.
        set({ loading: false });
      }
    });
  },
  setUser: (user) => {
    set({ user });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
  refreshProfile: async () => {
    const user = get().user;
    if (user) {
      const profile = await fetchUserProfile(user.id);
      set({ profile });
    }
  }
}));
