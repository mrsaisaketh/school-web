import { db } from './db.js';

export async function logAuditEvent({ profileId, userRole, action, entity, entityId, prevValue, newValue, ipAddress }) {
  try {
    await db.auditLog.create({
      data: {
        profileId: profileId || null,
        userRole: userRole || 'SYSTEM',
        action,
        entity,
        entityId: entityId || null,
        prevValue: prevValue ? JSON.stringify(prevValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress: ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}
