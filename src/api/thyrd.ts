import { apiGet, apiPost, apiPut } from '@/lib/api'
import type {
  NotificationProviderConfig,
  NotificationProviderConfigInput,
} from '@/lib/types'

export async function getProviderConfig(tenantCode?: string): Promise<NotificationProviderConfig> {
  const q = tenantCode ? `?tenantCode=${encodeURIComponent(tenantCode)}` : ''
  return apiGet('thyrd', `/thyrd/config${q}`)
}

export async function updateProviderConfig(
  body: NotificationProviderConfigInput,
  tenantCode?: string,
): Promise<NotificationProviderConfig> {
  const q = tenantCode ? `?tenantCode=${encodeURIComponent(tenantCode)}` : ''
  return apiPut('thyrd', `/thyrd/config${q}`, body)
}

export async function sendBrevoEmail(
  body: {
    to: string[]
    subject?: string
    html?: string
    text?: string
    from?: string
    fromName?: string
    replyTo?: string[]
  },
  tenantCode?: string,
): Promise<{ messageId: string }> {
  return apiPost('thyrd', '/thyrd/brevo/notify/email', { ...body, tenantCode })
}

export async function sendBrevoSms(
  body: {
    phoneNumber: string
    message: string
  },
  tenantCode?: string,
): Promise<{ messageId: string }> {
  return apiPost('thyrd', '/thyrd/brevo/notify/sms', { ...body, tenantCode })
}

export async function sendTwilioEmail(
  body: {
    to: string[]
    subject?: string
    html?: string
    text?: string
    from?: string
    fromName?: string
    replyTo?: string[]
  },
  tenantCode?: string,
): Promise<{ messageId: string }> {
  return apiPost('thyrd', '/thyrd/twilio/notify/email', { ...body, tenantCode })
}

export async function sendTwilioSms(
  body: {
    phoneNumber: string
    message: string
  },
  tenantCode?: string,
): Promise<{ messageId: string }> {
  return apiPost('thyrd', '/thyrd/twilio/notify/sms', { ...body, tenantCode })
}

export async function sendAwsEmail(
  body: {
    to: string[]
    subject?: string
    html?: string
    text?: string
    from?: string
    fromName?: string
    replyTo?: string[]
  },
  tenantCode?: string,
): Promise<{ messageId: string }> {
  return apiPost('thyrd', '/thyrd/aws/notify/email', { ...body, tenantCode })
}

export async function sendAwsSms(
  body: {
    phoneNumber: string
    message: string
  },
  tenantCode?: string,
): Promise<{ messageId: string }> {
  return apiPost('thyrd', '/thyrd/aws/notify/sms', { ...body, tenantCode })
}