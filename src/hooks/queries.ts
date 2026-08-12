import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignRolePermissions,
  assignRoles,
  createPermission,
  createRole,
  createTenant,
  createUser,
  dashboardSummary,
  deletePermission,
  deleteRole,
deleteUser,
deleteUserHard,
resendVerificationEmail,
  registerTotp,
  verifyTotp,
  enableEmailMfa,
  verifyEmailMfa,
  disableMfa,
  deactivateTenant,
  getRole,
  getRolePermissions,
  getUser,
  getUserPermissions,
  listPermissions,
  listRoles,
  listTenants,
  listUsers,
  removeRole,
  removeRolePermission,
  updatePermission,
  updateRole,
  updateTenant,
  updateUser,
  listPaises,
} from '@/api/security'
import { createProduct, deleteProduct, listProducts, updateProduct } from '@/api/catalogs'
import { listAudit, listAuditByUser } from '@/api/cross'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

export const queryKeys = {
  users: 'users',
  user: 'user',
  roles: 'roles',
  role: 'role',
  permissions: 'permissions',
  rolePermissions: 'role-permissions',
  userPermissions: 'user-permissions',
  products: 'products',
  audit: 'audit',
  dashboard: 'dashboard',
  tenants: 'tenants',
  providerConfig: 'provider-config',
  paises: 'paises',
} as const

export function useUsers(params?: { status?: string; email?: string; document?: string }) {
  return useQuery({
    queryKey: [queryKeys.users, params],
    queryFn: () => listUsers(params),
  })
}

export function useGetUserDetail(userId: string | null) {
  return useQuery({
    queryKey: [queryKeys.user, userId],
    queryFn: () => getUser(userId as string),
    enabled: Boolean(userId),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: [queryKeys.roles],
    queryFn: listRoles,
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: [queryKeys.permissions],
    queryFn: listPermissions,
  })
}

export function useUserPermissions(userId: string | null) {
  return useQuery({
    queryKey: [queryKeys.userPermissions, userId],
    queryFn: () => getUserPermissions(userId as string),
    enabled: Boolean(userId),
  })
}

export function useProducts(params?: { status?: string; name?: string }) {
  return useQuery({
    queryKey: [queryKeys.products, params],
    queryFn: () => listProducts(params),
  })
}

export function useAudit(params?: {
  entity?: string
  entityKey?: string
  tenantId?: string
  action?: string
}) {
  return useQuery({
    queryKey: [queryKeys.audit, params],
    queryFn: () => listAudit(params),
    enabled: Boolean(params && (params.entity && params.entityKey && params.tenantId)),
  })
}

export function useAuditByUser(params?: {
  userId: string
  tenantId: string
  action?: string
  entity?: string
}) {
  return useQuery({
    queryKey: [queryKeys.audit, params],
    queryFn: () => listAuditByUser(params as NonNullable<typeof params>),
    enabled: Boolean(params?.userId && params?.tenantId),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.users] })
      toast.success('User created successfully')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create user'),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: Parameters<typeof updateUser>[1] }) =>
      updateUser(userId, body),
    onSuccess: (updated, { userId }) => {
      qc.invalidateQueries({ queryKey: [queryKeys.users] })
      qc.invalidateQueries({ queryKey: [queryKeys.user, userId] })
      const current = useAuthStore.getState().user
      if (current?.userId === userId && updated) {
        useAuthStore.getState().updateUser(updated)
      }
      toast.success('User updated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.users] })
      toast.success('User deactivated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Delete failed'),
  })
}

export function useDeleteUserHard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteUserHard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.users] })
      toast.success('User permanently deleted')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Permanent delete failed'),
  })
}

export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => {
      toast.success('Verification email sent')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to send verification email'),
  })
}

export function useRegisterTotp() {
  return useMutation({
    mutationFn: registerTotp,
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to register TOTP'),
  })
}

export function useVerifyTotp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, code }: { userId: string; code: string }) => verifyTotp(userId, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.user] })
      toast.success('TOTP activated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Invalid TOTP code'),
  })
}

export function useEnableEmailMfa() {
  return useMutation({
    mutationFn: enableEmailMfa,
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to enable email MFA'),
  })
}

export function useVerifyEmailMfa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, challengeId, code }: { userId: string; challengeId: string; code: string }) =>
      verifyEmailMfa(userId, challengeId, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.user] })
      toast.success('Email MFA activated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Invalid code'),
  })
}

export function useDisableMfa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, channel }: { userId: string; channel: string }) => disableMfa(userId, channel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.user] })
      toast.success('MFA factor disabled')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to disable MFA'),
  })
}

export function useAssignRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: number[] }) =>
      assignRoles(userId, roles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.users] })
      toast.success('Roles assigned')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to assign roles'),
  })
}

export function useRemoveRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: number }) =>
      removeRole(userId, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.users] })
      toast.success('Role removed')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to remove role'),
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.roles] })
      toast.success('Role created')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create role'),
  })
}

export function useRole(roleId: string | null) {
  return useQuery({
    queryKey: [queryKeys.role, roleId],
    queryFn: () => getRole(roleId as string),
    enabled: Boolean(roleId),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: Parameters<typeof updateRole>[1] }) =>
      updateRole(roleId, body),
    onSuccess: (_, { roleId }) => {
      qc.invalidateQueries({ queryKey: [queryKeys.roles] })
      qc.invalidateQueries({ queryKey: [queryKeys.role, roleId] })
      toast.success('Role updated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.roles] })
      toast.success('Role deleted')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Delete failed'),
  })
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: [queryKeys.rolePermissions, roleId],
    queryFn: () => getRolePermissions(roleId as string),
    enabled: Boolean(roleId),
  })
}

export function useAssignRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      assignRolePermissions(roleId, permissionIds),
    onSuccess: (_, { roleId }) => {
      qc.invalidateQueries({ queryKey: [queryKeys.rolePermissions, roleId] })
      qc.invalidateQueries({ queryKey: [queryKeys.roles] })
      toast.success('Permissions assigned')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to assign permissions'),
  })
}

export function useRemoveRolePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      removeRolePermission(roleId, permissionId),
    onSuccess: (_, { roleId }) => {
      qc.invalidateQueries({ queryKey: [queryKeys.rolePermissions, roleId] })
      qc.invalidateQueries({ queryKey: [queryKeys.roles] })
      toast.success('Permission removed')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to remove permission'),
  })
}

export function useCreatePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPermission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.permissions] })
      toast.success('Permission created')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create permission'),
  })
}

export function useUpdatePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      permissionId,
      body,
    }: {
      permissionId: string
      body: Parameters<typeof updatePermission>[1]
    }) => updatePermission(permissionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.permissions] })
      toast.success('Permission updated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
  })
}

export function useDeletePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePermission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.permissions] })
      toast.success('Permission deleted')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Delete failed'),
  })
}

export function useDashboardSummary(tenantId?: number) {
  return useQuery({
    queryKey: [queryKeys.dashboard, tenantId],
    queryFn: () => dashboardSummary(tenantId),
  })
}

export function useCreateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      toast.success('Tenant created')
      qc.invalidateQueries({ queryKey: [queryKeys.tenants] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create tenant'),
  })
}

export function useTenants() {
  return useQuery({
    queryKey: [queryKeys.tenants],
    queryFn: listTenants,
  })
}

export function usePaises() {
  return useQuery({
    queryKey: [queryKeys.paises],
    queryFn: listPaises,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, body }: { tenantId: string; body: Parameters<typeof updateTenant>[1] }) =>
      updateTenant(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.tenants] })
      toast.success('Tenant updated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
  })
}

export function useDeactivateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deactivateTenant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.tenants] })
      toast.success('Tenant deactivated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Deactivate failed'),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.products] })
      toast.success('Product created')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create product'),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, body }: { productId: number; body: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(productId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.products] })
      toast.success('Product updated')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Update failed'),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKeys.products] })
      toast.success('Product deleted')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Delete failed'),
  })
}
