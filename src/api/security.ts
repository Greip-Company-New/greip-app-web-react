import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'
import type {
  DashboardSummary,
  MfaChallenge,
  PaginatedList,
  Pais,
  Permission,
  Role,
  RoleWithPermissions,
  Tenant,
  TokenResponse,
  User,
  UserDetail,
} from '@/lib/types'

export interface LoginRequest {
  email?: string
  documentType?: string
  documentNumber?: string
  password: string
  channel?: 'TOTP' | 'SMS' | 'EMAIL'
}

export async function login(body: LoginRequest): Promise<TokenResponse | MfaChallenge> {
  return apiPost('security', '/auth/login', body)
}

export async function verifyMfa(body: {
  mfaToken: string
  challengeId?: string
  code: string
}): Promise<TokenResponse> {
  return apiPost('security', '/auth/mfa/verify', body)
}

export async function switchMfaChannel(body: {
  mfaToken: string
  channel: string
}): Promise<{ channel: string; challengeId: string; maskedDestination?: string }> {
  return apiPost('security', '/auth/mfa/switch', body)
}

export async function refreshToken(refreshToken: string): Promise<TokenResponse> {
  return apiPost('security', '/auth/refresh', { refreshToken })
}

export async function logout(refreshToken: string, logoutAll = false): Promise<unknown> {
  return apiPost('security', '/auth/logout', { refreshToken, logoutAll })
}

export async function changePassword(body: {
  currentPassword: string
  newPassword: string
}): Promise<unknown> {
  return apiPost('security', '/auth/password/change', body)
}

export async function requestRecovery(email: string, channel?: 'EMAIL' | 'SMS'): Promise<unknown> {
  return apiPost('security', '/auth/password/recovery', { email, channel })
}

export async function resetPassword(body: {
  email: string
  code: string
  newPassword: string
}): Promise<unknown> {
  return apiPost('security', '/auth/password/reset', body)
}

export async function listUsers(params?: {
  status?: string
  email?: string
  document?: string
}): Promise<PaginatedList<User>> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.email) q.set('email', params.email)
  if (params?.document) q.set('document', params.document)
  return apiGet('security', `/user${q.toString() ? `?${q}` : ''}`)
}

export async function getUser(userId: string): Promise<UserDetail> {
  return apiGet('security', `/user/${userId}`)
}

export async function createUser(body: {
  email: string
  documentType: string
  documentNumber: string
  firstName: string
  fatherLastName: string
  motherLastName?: string
  phone?: string
  password: string
}): Promise<User> {
  return apiPost('security', '/user', body)
}

export async function updateUser(
  userId: string,
  body: {
    email?: string
    documentType?: string
    documentNumber?: string
    firstName?: string
    fatherLastName?: string
    motherLastName?: string
    phone?: string
    status?: 'A' | 'I'
  },
): Promise<User> {
  return apiPut('security', `/user/${userId}`, body)
}

export async function deleteUser(userId: string): Promise<unknown> {
  return apiDelete('security', `/user/${userId}`)
}

export async function deleteUserHard(userId: string): Promise<unknown> {
  return apiDelete('security', `/user/${userId}/hard`)
}

export async function resendVerificationEmail(userId: string): Promise<unknown> {
  return apiPost('security', `/user/${userId}/resend-verification`)
}

export async function registerTotp(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
  return apiPost('security', `/user/${userId}/mfa/totp`)
}

export async function verifyTotp(userId: string, code: string): Promise<unknown> {
  return apiPost('security', `/user/${userId}/mfa/totp/verify`, { code })
}

export async function enableEmailMfa(userId: string): Promise<{ challengeId: string; maskedDestination?: string }> {
  return apiPost('security', `/user/${userId}/mfa/email`)
}

export async function verifyEmailMfa(userId: string, challengeId: string, code: string): Promise<unknown> {
  return apiPost('security', `/user/${userId}/mfa/email/verify`, { challengeId, code })
}

export async function disableMfa(userId: string, channel: string): Promise<unknown> {
  return apiDelete('security', `/user/${userId}/mfa/${channel}`)
}

export async function assignRoles(userId: string, roles: (number | string)[]): Promise<unknown> {
  return apiPost('security', `/user/${userId}/roles`, { roles: roles.map(String) })
}

export async function removeRole(userId: string, roleId: number | string): Promise<unknown> {
  return apiDelete('security', `/user/${userId}/roles/${roleId}`)
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await apiGet<{ userId: string; permissions: string[] }>(
    'security',
    `/user/${userId}/permissions`,
  )
  return result?.permissions ?? []
}

export async function listRoles(): Promise<Role[]> {
  return apiGet('security', '/role')
}

export async function getRole(roleId: string): Promise<RoleWithPermissions> {
  return apiGet('security', `/role/${roleId}`)
}

export async function createRole(body: {
  code: string
  name: string
  description?: string
}): Promise<Role> {
  return apiPost('security', '/role', body)
}

export async function updateRole(
  roleId: string,
  body: {
    name?: string
    description?: string
    status?: 'A' | 'I'
  },
): Promise<Role> {
  return apiPut('security', `/role/${roleId}`, body)
}

export async function deleteRole(roleId: string): Promise<unknown> {
  return apiDelete('security', `/role/${roleId}`)
}

export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const result = await apiGet<{ roleId: string; permissions: Permission[] }>(
    'security',
    `/role/${roleId}/permissions`,
  )
  return result?.permissions ?? []
}

export async function assignRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<Permission[]> {
  const result = await apiPost<{ roleId: string; permissions: Permission[] }>(
    'security',
    `/role/${roleId}/permissions`,
    { permissions: permissionIds },
  )
  return result?.permissions ?? []
}

export async function removeRolePermission(
  roleId: string,
  permissionId: string,
): Promise<unknown> {
  return apiDelete('security', `/role/${roleId}/permissions/${permissionId}`)
}

export async function listPermissions(): Promise<Permission[]> {
  return apiGet('security', '/permission')
}

export async function createPermission(body: {
  code: string
  name: string
  description?: string
}): Promise<Permission> {
  return apiPost('security', '/permission', body)
}

export async function updatePermission(
  permissionId: string,
  body: {
    name?: string
    description?: string
    status?: 'A' | 'I'
  },
): Promise<Permission> {
  return apiPut('security', `/permission/${permissionId}`, body)
}

export async function deletePermission(permissionId: string): Promise<unknown> {
  return apiDelete('security', `/permission/${permissionId}`)
}

export async function createTenant(body: {
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
  admin_email?: string
  admin_password?: string
  admin_first_name?: string
  admin_father_last_name?: string
  status?: 'A' | 'I'
}): Promise<Tenant> {
  return apiPost('security', '/tenant', body)
}

export async function listTenants(): Promise<Tenant[]> {
  return apiGet('security', '/tenant')
}

export async function updateTenant(
  tenantId: string,
  body: {
    name?: string
    ruc?: string
    razon_social?: string
    pais_id?: number
    idioma?: string
    moneda?: string
    formato_fecha?: string
    formato_fecha_hora?: string
    formato_decimales?: string
    status?: 'A' | 'I'
  },
): Promise<Tenant> {
  return apiPut('security', `/tenant/${tenantId}`, body)
}

export async function deactivateTenant(tenantId: string): Promise<Tenant> {
  return apiDelete('security', `/tenant/${tenantId}`)
}

export async function dashboardSummary(tenantId?: number): Promise<DashboardSummary> {
  const q = tenantId ? `?tenantId=${tenantId}` : ''
  return apiGet('security', `/dashboard${q}`)
}

export async function listPaises(): Promise<Pais[]> {
  return apiGet('security', '/pais')
}

export async function adminResetPassword(userId: string, newPassword: string): Promise<unknown> {
  return apiPost('security', `/user/${userId}/password/reset`, { userId, newPassword })
}
