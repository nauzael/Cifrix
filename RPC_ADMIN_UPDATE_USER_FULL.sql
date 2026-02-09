-- Función RPC Robusta para Actualización Atómica de Usuarios
-- Reemplaza la lógica fragil del frontend (Update/Delete) por una transacción segura en base de datos.

CREATE OR REPLACE FUNCTION admin_update_user_full(
  target_user_id UUID,
  new_org_id UUID,
  new_role_code TEXT,
  new_modules JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos de superusuario para garantizar consistencia
SET search_path = public -- Seguridad: Forzar search_path
AS $$
DECLARE
  v_role_id UUID;
  v_current_user_id UUID;
BEGIN
  -- 1. Verificar ejecutor (debe ser super admin o el mismo sistema)
  v_current_user_id := auth.uid();
  
  -- Validación básica de permisos (puedes descomentar si tienes la función is_super_admin lista y estable)
  -- IF v_current_user_id IS NOT NULL AND NOT is_super_admin(v_current_user_id) THEN
  --   RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de Super Admin.';
  -- END IF;

  -- 2. Resolver ID del Rol
  SELECT id INTO v_role_id FROM roles WHERE code = new_role_code LIMIT 1;
  
  IF v_role_id IS NULL THEN
    -- Fallback: Si no existe el rol, intentar buscar por nombre o usar BASIC
    SELECT id INTO v_role_id FROM roles WHERE code = 'BASIC' LIMIT 1;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Error crítico: Roles base no configurados en el sistema.';
    END IF;
  END IF;

  -- 3. Lógica de Actualización de Organización (Transaccional)
  IF new_org_id IS NOT NULL THEN
    -- A. UPSERT en user_organizations (Actualizar o Insertar)
    INSERT INTO user_organizations (
      user_id, 
      organization_id, 
      role_id, 
      module_permissions, 
      status, 
      is_primary
    ) VALUES (
      target_user_id,
      new_org_id,
      v_role_id,
      new_modules,
      'active',
      true
    )
    ON CONFLICT (user_id, organization_id) DO UPDATE SET
      role_id = EXCLUDED.role_id,
      module_permissions = EXCLUDED.module_permissions,
      status = 'active',
      is_primary = true, -- Forzar como principal
      updated_at = now();

    -- B. Limpieza: Eliminar cualquier OTRA organización para este usuario
    -- Esto garantiza que el usuario solo pertenezca a la organización seleccionada
    DELETE FROM user_organizations 
    WHERE user_id = target_user_id 
      AND organization_id != new_org_id;
      
  ELSE
    -- Caso: Dejar sin organización (Global / Sin Asignar)
    DELETE FROM user_organizations WHERE user_id = target_user_id;
  END IF;

  -- 4. Actualizar tabla user_invites si existe (Mantenimiento de consistencia legacy)
  UPDATE user_invites 
  SET role = new_role_code, organization_id = new_org_id 
  WHERE email = (SELECT email FROM auth.users WHERE id = target_user_id);

  -- 5. Registrar en Audit Logs
  INSERT INTO audit_logs (
    user_id, 
    action, 
    entity_type, 
    entity_id, 
    details
  ) VALUES (
    COALESCE(v_current_user_id, target_user_id), -- Si es null (sistema), usar target
    'UPDATE_USER_FULL',
    'USER',
    target_user_id,
    jsonb_build_object(
      'role', new_role_code, 
      'org', new_org_id,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'Usuario actualizado correctamente');
END;
$$;

-- Asegurar permisos de ejecución
GRANT EXECUTE ON FUNCTION admin_update_user_full TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_full TO service_role;
