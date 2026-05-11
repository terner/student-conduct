import { createAdminClient } from '@/lib/supabase/server';

type JsonRecord = Record<string, unknown>;

interface AuditLogInput {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: JsonRecord;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface ActionLogInput {
  actorId?: string | null;
  event: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: JsonRecord;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);

  const redactedKeys = new Set(['password', 'token', 'access_token', 'refresh_token', 'private_key', 'google_drive_private_key']);
  return Object.fromEntries(
    Object.entries(value as JsonRecord).map(([key, item]) => [
      key,
      redactedKeys.has(key.toLowerCase()) ? '[redacted]' : sanitize(item),
    ]),
  );
}

function uuidOrNull(value?: string | null) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function getRequestAuditInfo(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return {
    ipAddress: forwardedFor || realIp || null,
    userAgent: request.headers.get('user-agent') || null,
  };
}

export async function logAudit(input: AuditLogInput) {
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('audit_logs').insert({
      actor_id: input.actorId || null,
      action: input.action,
      target_type: input.targetType || null,
      target_id: uuidOrNull(input.targetId),
      before_data: input.beforeData === undefined ? null : sanitize(input.beforeData),
      after_data: input.afterData === undefined ? null : sanitize(input.afterData),
      metadata: input.metadata ? sanitize(input.metadata) : null,
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
    });
  } catch (error) {
    console.error('[Audit Log] Failed to write audit log:', error);
  }
}

export async function logAction(input: ActionLogInput) {
  try {
    const adminClient = await createAdminClient();
    await adminClient.from('action_logs').insert({
      actor_id: input.actorId || null,
      event: input.event,
      resource_type: input.resourceType || null,
      resource_id: uuidOrNull(input.resourceId),
      metadata: input.metadata ? sanitize(input.metadata) : null,
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
    });
  } catch (error) {
    console.error('[Action Log] Failed to write action log:', error);
  }
}
