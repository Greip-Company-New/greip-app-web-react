import { apiGet, apiPost } from '@/lib/api'
import type { EntityChangeLog, PaginatedList } from '@/lib/types'

export async function listAudit(params?: {
  entity?: string
  entityKey?: string
  tenantId?: string
  action?: string
  sourceIp?: string
}): Promise<PaginatedList<EntityChangeLog>> {
  const q = new URLSearchParams()
  if (params?.entity) q.set('entity', params.entity)
  if (params?.entityKey) q.set('entityKey', params.entityKey)
  if (params?.tenantId) q.set('tenantId', params.tenantId)
  if (params?.action) q.set('action', params.action)
  if (params?.sourceIp) q.set('sourceIp', params.sourceIp)
  return apiGet('security', `/entity-audit${q.toString() ? `?${q}` : ''}`)
}

export async function listAuditByUser(_params?: {
  userId?: string
  tenantId?: string
  action?: string
  entity?: string
}): Promise<PaginatedList<EntityChangeLog>> {
  const q = new URLSearchParams()
  if (_params?.action) q.set('action', _params.action)
  if (_params?.entity) q.set('entity', _params.entity)
  const qs = q.toString()
  return apiGet('security', `/entity-audit/user${qs ? `?${qs}` : ''}`)
}

export interface EmailPayload {
  to: string[]
  subject?: string
  html?: string
  text?: string
  from?: string
  replyTo?: string[]
}

export async function sendEmail(body: EmailPayload): Promise<unknown> {
  return apiPost('cross', '/cross/email', body)
}

export async function sendSms(body: {
  phoneNumber: string
  message: string
}): Promise<unknown> {
  return apiPost('cross', '/cross/sms', body)
}

export async function encryptTokenData(data: unknown): Promise<{ encrypted?: string }> {
  return apiPost('cross', '/cross/token/encrypt', { data })
}

export async function decryptTokenData(encrypted: string): Promise<{ data?: unknown }> {
  return apiPost('cross', '/cross/token/decrypt', { encrypted })
}
