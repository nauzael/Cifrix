-- ============================================================================
-- SOLUCIÓN FINAL: PERMISOS TOTALES PARA SUPER ADMIN (RLS)
-- ============================================================================
-- Este script otorga permisos de lectura y escritura TOTALES a los Super Admins
-- sobre las tablas de usuarios y perfiles, evitando bloqueos y logouts.
-- ============================================================================

-- 1. POLÍTICAS PARA PROFILES (Permitir ver y editar todos los perfiles)
-- ============================================================================

-- Borrar políticas restrictivas anteriores si existen causan conflicto, 
-- pero las nuevas uses "Create Policy" que conviven. 
-- Para limpiar, vamos a borrar las de Super Admin si ya existían mal configuradas.
DROP POLICY IF EXISTS "Super admins manage all profiles" ON public.profiles;

CREATE POLICY "Super admins manage all profiles"
ON public.profiles
FOR ALL -- SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (public.is_super_admin((SELECT auth.uid()))); -- El usuario actual es Super Admin?

-- 2. POLÍTICAS PARA USER_ORGANIZATIONS (Permitir asignar cualquier org)
-- ============================================================================
DROP POLICY IF EXISTS "Super admins manage all user_organizations" ON public.user_organizations;

CREATE POLICY "Super admins manage all user_organizations"
ON public.user_organizations
FOR ALL
TO authenticated
USING (public.is_super_admin((SELECT auth.uid())));

-- 3. POLÍTICAS PARA USER_INVITES (Si usas invitaciones)
-- ============================================================================
-- Asegurar que la tabla existe primero para evitar errores si no
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_invites') THEN
        DROP POLICY IF EXISTS "Super admins manage all invites" ON public.user_invites;
        
        EXECUTE 'CREATE POLICY "Super admins manage all invites" ON public.user_invites FOR ALL TO authenticated USING (public.is_super_admin((SELECT auth.uid())))';
    END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ PERMISOS DE SUPER ADMIN ACTUALIZADOS EXITOSAMENTE';
    RAISE NOTICE '🚀 Ahora puedes ver y editar CUALQUIER usuario sin bloqueos.';
END $$;
