import { db, AuditLog } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function logActivity(params: {
  organization_id: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT';
  entity_type: 'TRANSACTION' | 'MEMBER' | 'ACCOUNT' | 'CONTRIBUTION' | 'PROJECT' | 'ORGANIZATION' | 'USER' | 'PAYMENT';
  entity_id?: string | null;
  old_data?: any | null;
  new_data?: any | null;
}) {
  const auditLog: AuditLog = {
    id: uuidv4(),
    organization_id: params.organization_id,
    user_id: params.user_id,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id || null,
    old_data: params.old_data || null,
    new_data: params.new_data || null,
    ip_address: null, // This would ideally be captured on the server
    user_agent: navigator.userAgent,
    created_at: new Date().toISOString(),
    sync_status: 'pendiente'
  };

  try {
    await db.audit_logs.add(auditLog);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
