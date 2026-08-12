export interface ApiEnvelope<T = unknown> {
  success: boolean
  message: string
  statusCode: number
  timestamp: string
  data?: T
  error?: { code?: string; details?: unknown }
  path?: string
  requestId?: string
  metadata?: {
    pagination?: Pagination
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type DocumentType = 'D' | 'R' | 'C'
export type UserStatus = 'A' | 'I'
export type ProductStatus = 'A' | 'I'
export type Currency = 'PEN' | 'USD'
export type MfaChannel = 'TOTP' | 'SMS' | 'EMAIL'

export interface MfaFactor {
  active: boolean
  verified: boolean
}

export interface User {
  userId: string
  tenant: string
  tenantId?: number
  email: string
  emailVerified?: boolean
  documentType: DocumentType
  documentNumber: string
  firstName: string
  fatherLastName: string
  motherLastName?: string
  phone?: string
  status: UserStatus
  mfa?: Record<string, MfaFactor>
  createdBy?: string
  createdByChannel?: string
  createdAt?: string
  updatedBy?: string
  updatedByChannel?: string
  updatedAt?: string
}

export interface Role {
  id: number
  tenantId: number
  code: string
  name: string
  description?: string
  status: string
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

export interface Permission {
  id: number
  tenantId: number
  code: string
  name: string
  description?: string
  status: string
  createdBy?: string
  createdAt?: string
}

export interface RoleWithPermissions extends Role {
  permissions?: Permission[]
}

export interface Tenant {
  id: number
  code: string
  name: string
  ruc?: string
  razon_social?: string
  pais_id?: number
  idioma?: string
  moneda?: string
  formato_fecha?: string
  formato_fecha_hora?: string
  formato_decimales?: string
  status: 'A' | 'I'
  createdBy?: string
  createdByChannel?: string
  createdAt?: string
  updatedBy?: string
  updatedByChannel?: string
  updatedAt?: string
}

export interface Pais {
  id: number
  code_iso2: string
  code_iso3: string
  name_es: string
  name_en: string
  phone_code?: string
  status: string
}

export interface RolePermissions {
  roleId: number | string
  permissions: Permission[]
}

export interface DashboardSummary {
  tenant: { id: number; code: string; name: string }
  users: { active: number; total: number }
  roles: { active: number; total: number }
  permissions: { active: number; total: number }
  products: { active: number; total: number }
  audit: { total: number; last24h: number }
}

export interface EntityChangeLog {
  id: string
  entity: string
  entity_key: string
  tenant_id: number
  change_type: string
  action: string
  status: string
  user_id: string
  user_first_name: string
  user_father_last_name: string
  user_mother_last_name?: string
  channel: string
  source_ip: string
  user_agent?: string
  changes: Record<string, unknown>
  created_at: string
}

export interface Product {
  productId: number
  tenantId: number
  name: string
  description?: string
  price: number
  currency: Currency
  status: ProductStatus
  createdBy?: string
  createdByChannel?: string
  createdAt?: string
  updatedBy?: string
  updatedByChannel?: string
  updatedAt?: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: User
}

export interface MfaChallenge {
  requiresMfa: boolean
  channel?: MfaChannel
  challengeId?: string
  maskedDestination?: string
  mfaToken?: string
  activeChannels?: string[]
  expiresAt?: number
}

export interface PaginatedList<T> {
  data: T[]
  pagination: Pagination
}

export interface UserPerson {
  id: number
  tenantId: number
  firstName: string
  fatherLastName: string
  motherLastName: string | null
  documentType: string
  documentNumber: string
  email: string
  phone: string | null
  status: string
}

export interface UserDetail {
  user: User
  person?: UserPerson | null
  roles: Role[]
  permissions: string[]
}

// ---- Notificaciones de terceros (service-third-party) ----

export type NotificationProvider = 'BREVO' | 'TWILIO' | 'SES' | 'SNS'

export interface BrevoSettings {
  enabled: boolean
  apiKey: string
  fromEmail: string
  fromName: string
  smsSender: string
}

export interface TwilioSettings {
  enabled: boolean
  accountSid: string
  authToken: string
  sendgridApiKey: string
  fromPhone: string
  fromEmail: string
  fromName: string
}

export interface SesSettings {
  enabled: boolean
  fromEmail: string
  fromName: string
  region: string
}

export interface SnsSettings {
  enabled: boolean
  senderId: string
  fromPhone: string
  region: string
}

export interface NotificationProviderConfig {
  tenant: string
  emailProvider: NotificationProvider
  smsProvider: NotificationProvider
  brevo: BrevoSettings
  twilio: TwilioSettings
  ses: SesSettings
  sns: SnsSettings
  updatedAt: string
}

export interface NotificationProviderConfigInput {
  emailProvider: NotificationProvider
  smsProvider: NotificationProvider
  brevo?: Partial<BrevoSettings>
  twilio?: Partial<TwilioSettings>
  ses?: Partial<SesSettings>
  sns?: Partial<SnsSettings>
}
