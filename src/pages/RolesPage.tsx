import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronRight, History, Loader2, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, PageHeader, StatusBadge } from '@/components/common'
import AuditDialog, { type AuditTarget } from '@/components/AuditDialog'
import type { Role } from '@/lib/types'
import {
  useAssignRolePermissions,
  useCreateRole,
  useDeleteRole,
  usePermissions,
  useRolePermissions,
  useRemoveRolePermission,
  useRoles,
  useUpdateRole,
} from '@/hooks/queries'

const schema = z.object({
  name: z.string().min(2, 'Enter the name'),
  description: z.string().optional(),
  status: z.enum(['A', 'I']),
})

const createRoleSchema = schema.extend({
  code: z.string().min(2, 'Enter the code'),
}).omit({ status: true })

export default function RolesPage() {
  const [open, setOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null)
  const [auditTarget, setAuditTarget] = useState<AuditTarget | null>(null)
  const { data, isLoading, isError } = useRoles()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()
  const roles = data ?? []

  const createForm = useForm<z.infer<typeof createRoleSchema>>({
    resolver: zodResolver(createRoleSchema),
  })
  const editForm = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const openEdit = (role: Role) => {
    setEditRole(role)
    editForm.reset({
      name: role.name,
      description: role.description ?? '',
      status: role.status === 'I' ? 'I' : 'A',
    })
  }

  const onCreate = async (values: z.infer<typeof createRoleSchema>) => {
    await createRole.mutateAsync(values)
    setOpen(false)
    createForm.reset()
  }

  const onEdit = async (values: z.infer<typeof schema>) => {
    if (!editRole) return
    await updateRole.mutateAsync({ roleId: String(editRole.id), body: values })
    setEditRole(null)
  }

  const onDelete = async (role: Role) => {
    if (!confirm(`Delete role ${role.name}?`)) return
    await deleteRole.mutateAsync(String(role.id))
  }

  return (
    <>
      <PageHeader
        title="Roles"
        description="System roles catalog (RBAC)"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New role
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <EmptyState message="Failed to load roles" />
          ) : roles.length === 0 ? (
            <EmptyState message="No roles registered" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">{r.id}</TableCell>
                      <TableCell className="font-mono text-sm">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.description ?? '—'}
                      </TableCell>
                      <TableCell>
                        <RolePermissionsCell roleId={r.id} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setAuditTarget({
                                entity: 'role',
                                key: String(r.id),
                                tenantId: r.tenantId ?? 1,
                                kind: r.name,
                              })
                            }
                            title="View audit"
                          >
                            <History className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPermissionsRole(r)}
                            title="Manage permissions"
                          >
                            <Lock className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(r)}
                            title="Delete"
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New role</DialogTitle>
            <DialogDescription>Define a role to assign to users.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input placeholder="E.g. ADMIN" {...createForm.register('code')} />
              {createForm.formState.errors.code && (
                <p className="text-sm text-destructive">{createForm.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Administrator" {...createForm.register('name')} />
              {createForm.formState.errors.name && (
                <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...createForm.register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending && <Loader2 className="size-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editRole)} onOpenChange={(o) => !o && setEditRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>Update the role information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Administrator" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...editForm.register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.watch('status')}
                onValueChange={(v) => editForm.setValue('status', v as 'A' | 'I')}
                items={{
                  A: 'Active',
                  I: 'Inactive',
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Active</SelectItem>
                  <SelectItem value="I">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRole(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateRole.isPending}>
                {updateRole.isPending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RolePermissionsDialog
        key={permissionsRole?.id ?? 'none'}
        role={permissionsRole}
        onClose={() => setPermissionsRole(null)}
      />
      <AuditDialog target={auditTarget} onClose={() => setAuditTarget(null)} />
    </>
  )
}

function RolePermissionsCell({ roleId }: { roleId: number }) {
  const { data: permissions, isLoading } = useRolePermissions(String(roleId))
  const perms = permissions ?? []

  if (isLoading) return <span className="text-xs text-muted-foreground">…</span>
  if (perms.length === 0) return <span className="text-xs text-muted-foreground">—</span>

  return (
    <div className="flex flex-wrap gap-1">
      {perms.slice(0, 4).map((p) => (
        <Badge key={p.id} variant="secondary">
          {p.code}
        </Badge>
      ))}
      {perms.length > 4 && (
        <Badge variant="outline">+{perms.length - 4}</Badge>
      )}
    </div>
  )
}

type PermissionModule = {
  key: string
  label: string
  namespaces: string[]
}

const PERMISSION_MODULES: PermissionModule[] = [
  { key: 'seguridad', label: 'Users & Security', namespaces: ['user', 'role', 'permission', 'group', 'auth', 'mfa', 'audit'] },
  { key: 'catalogo', label: 'Sales & Catalog', namespaces: ['product', 'tenant'] },
  { key: 'dashboard', label: 'Analytics', namespaces: ['dashboard'] },
  { key: 'notify', label: 'Notifications', namespaces: ['notify'] },
]

const PERMISSION_GROUPS: Record<string, string> = {
  'user.create': 'user',
  'user.read': 'user',
  'user.update': 'user',
  'user.delete': 'user',
  'role.manage': 'role',
  'group.manage': 'group',
  'permission.read': 'permission',
  'permission.manage': 'permission',
  'product.create': 'product',
  'product.read': 'product',
  'product.update': 'product',
  'product.delete': 'product',
  'audit.read': 'audit',
  'auth.manage': 'auth',
  'mfa.manage': 'mfa',
  'tenant.manage': 'tenant',
  'dashboard.read': 'dashboard',
  'notify.config.read': 'notify',
  'notify.config.manage': 'notify',
}

const PERMISSION_LABELS: Record<string, string> = {
  user: 'Users', role: 'Roles', permission: 'Permissions', group: 'Groups',
  product: 'Products', audit: 'Audit', auth: 'Authentication', mfa: 'MFA',
  tenant: 'Companies', dashboard: 'Dashboard', notify: 'Notifications',
}

function RolePermissionsDialog({
  role,
  onClose,
}: {
  role: Role | null
  onClose: () => void
}) {
  const { data: currentData } = useRolePermissions(role ? String(role.id) : null)
  const { data: catalogData } = usePermissions()
  const assign = useAssignRolePermissions()
  const remove = useRemoveRolePermission()
  const [selected, setSelected] = useState<number[]>([])
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const currentIds = (currentData ?? []).map((p) => p.id)
  const catalog = catalogData ?? []

  useEffect(() => {
    if (currentData) {
      setSelected(currentData.map((p) => p.id))
    }
  }, [currentData])

  // Auto-open groups with selections
  useEffect(() => {
    const withSelections: Record<string, boolean> = {}
    for (const ns of Object.keys(PERMISSION_LABELS)) {
      if (groupSelectedCount(ns) > 0) withSelections[ns] = true
    }
    setOpenGroups((prev) => ({ ...withSelections, ...prev }))
  }, [currentData])

  const handleOpenChange = (openChanges: boolean) => {
    if (!openChanges) {
      onClose()
      setSelected([])
    }
  }

  const isSelected = (id: number) => selected.includes(id)

  const toggle = (id: number, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const toggleGroup = (namespace: string) => {
    setOpenGroups((prev) => ({ ...prev, [namespace]: !prev[namespace] }))
  }

  const selectAllGroup = (namespace: string, checked: boolean) => {
    const permIds = catalog.filter((p) => {
      const ns = PERMISSION_GROUPS[p.code] ?? p.code.split('.')[0]
      return ns === namespace
    }).map((p) => p.id)
    setSelected((prev) =>
      checked
        ? [...new Set([...prev, ...permIds])]
        : prev.filter((id) => !permIds.includes(id)),
    )
  }

  const selectAllModule = (namespaces: string[], checked: boolean) => {
    const permIds = catalog.filter((p) => {
      const ns = PERMISSION_GROUPS[p.code] ?? p.code.split('.')[0]
      return namespaces.includes(ns)
    }).map((p) => p.id)
    setSelected((prev) =>
      checked
        ? [...new Set([...prev, ...permIds])]
        : prev.filter((id) => !permIds.includes(id)),
    )
  }

  const groupSelectedCount = (namespace: string) => {
    const permIds = catalog.filter((p) => {
      const ns = PERMISSION_GROUPS[p.code] ?? p.code.split('.')[0]
      return ns === namespace
    }).map((p) => p.id)
    return selected.filter((id) => permIds.includes(id)).length
  }

  const groupTotalCount = (namespace: string) => {
    return catalog.filter((p) => {
      const ns = PERMISSION_GROUPS[p.code] ?? p.code.split('.')[0]
      return ns === namespace
    }).length
  }

  const moduleCounts = (namespaces: string[]) => {
    const permIds = catalog.filter((p) => {
      const ns = PERMISSION_GROUPS[p.code] ?? p.code.split('.')[0]
      return namespaces.includes(ns)
    }).map((p) => p.id)
    const sel = selected.filter((id) => permIds.includes(id)).length
    return { selected: sel, total: permIds.length }
  }

  const handleSave = async () => {
    if (!role) return
    const toAdd = selected.filter((id) => !currentIds.includes(id))
    const toRemove = currentIds.filter((id) => !selected.includes(id))
    const promises: Promise<unknown>[] = []
    if (toAdd.length > 0) {
      promises.push(
        assign.mutateAsync({
          roleId: String(role.id),
          permissionIds: toAdd.map(String),
        }),
      )
    }
    toRemove.forEach((id) => {
      promises.push(
        remove.mutateAsync({ roleId: String(role.id), permissionId: String(id) }),
      )
    })
    await Promise.all(promises)
    onClose()
    setSelected([])
  }

  const totalSelected = selected.length
  const totalPerms = catalog.length

  return (
    <Dialog open={Boolean(role)} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage permissions</DialogTitle>
          <DialogDescription>
            {role ? `Role: ${role.name}. ${totalSelected} of ${totalPerms} permissions selected.` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(catalog.map((p) => p.id))} disabled={totalSelected === totalPerms}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])} disabled={totalSelected === 0}>
            Deselect all
          </Button>
        </div>

        <div className="space-y-4">
          {catalog.length === 0 && (
            <p className="text-sm text-muted-foreground">No permissions available.</p>
          )}
          {PERMISSION_MODULES.map((mod) => {
            const modCounts = moduleCounts(mod.namespaces)
            if (modCounts.total === 0) return null
            const modSelected = modCounts.selected === modCounts.total && modCounts.total > 0
            const modIndeterminate = modCounts.selected > 0 && modCounts.selected < modCounts.total

            return (
              <div key={mod.key} className="rounded-lg border">
                <label className="flex cursor-pointer items-center gap-2 p-3 bg-muted/30">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={modSelected}
                    ref={(el) => { if (el) el.indeterminate = modIndeterminate }}
                    onChange={(e) => selectAllModule(mod.namespaces, e.target.checked)}
                  />
                  <span className="flex-1 text-sm font-semibold">{mod.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {modCounts.selected}/{modCounts.total}
                  </span>
                </label>
                <div className="px-3 pb-3 space-y-2">
                  {mod.namespaces.map((ns) => {
                    const perms = catalog.filter((p) => (PERMISSION_GROUPS[p.code] ?? p.code.split('.')[0]) === ns)
                    if (perms.length === 0) return null
                    const selCount = groupSelectedCount(ns)
                    const totCount = groupTotalCount(ns)
                    const isOpen = openGroups[ns] ?? false

                    return (
                      <div key={ns} className="rounded border">
                        <label className="flex cursor-pointer items-center gap-2 p-2 hover:bg-muted/30">
                          <input
                            type="checkbox"
                            className="size-3.5 accent-primary"
                            checked={selCount === totCount && totCount > 0}
                            ref={(el) => { if (el) el.indeterminate = selCount > 0 && selCount < totCount }}
                            onChange={(e) => selectAllGroup(ns, e.target.checked)}
                          />
                          <button
                            type="button"
                            className="flex flex-1 items-center gap-1 text-xs font-medium"
                            onClick={() => toggleGroup(ns)}
                          >
                            {isOpen ? (
                              <ChevronDown className="size-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-3 text-muted-foreground" />
                            )}
                            {PERMISSION_LABELS[ns] ?? ns}
                          </button>
                          <span className="text-xs text-muted-foreground tabular-nums">{selCount}/{totCount}</span>
                        </label>
                        {isOpen && (
                          <div className="border-t px-2 py-1 space-y-0.5">
                            {perms.map((p) => (
                              <label
                                key={p.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/30"
                              >
                                <input
                                  type="checkbox"
                                  className="size-3.5 accent-primary"
                                  checked={isSelected(p.id)}
                                  onChange={(e) => toggle(p.id, e.target.checked)}
                                />
                                <span className="text-sm">{p.name}</span>
                                <span className="font-mono text-[11px] text-muted-foreground ml-auto">{p.code}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={assign.isPending || remove.isPending || !role} onClick={handleSave}>
            {(assign.isPending || remove.isPending) && <Loader2 className="size-4 animate-spin" />}
            Save permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}