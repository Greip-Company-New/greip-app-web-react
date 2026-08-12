import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { History, KeyRound, Loader2, Pencil, Plus, Trash2, UserCog, CheckCircle, XCircle, ShieldCheck, ShieldOff, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, PageHeader, StatusBadge } from '@/components/common'
import AuditDialog, { type AuditTarget } from '@/components/AuditDialog'
import type { User } from '@/lib/types'
import {
  useAssignRoles,
  useCreateUser,
  useDeleteUser,
  useDeleteUserHard,
  useResendVerificationEmail,
  useGetUserDetail,
  useRoles,
  useUpdateUser,
  useUsers,
} from '@/hooks/queries'
import { adminResetPassword } from '@/api/security'
import { toast } from 'sonner'

const createSchema = z.object({
  email: z.string().email('Invalid email'),
  documentType: z.enum(['D', 'R', 'C']),
  documentNumber: z.string().min(4, 'Enter a valid document'),
  firstName: z.string().min(2, 'Enter the first name'),
  fatherLastName: z.string().min(2, 'Enter the father last name'),
  motherLastName: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Minimum 8 characters'),
})

const editSchema = z.object({
  email: z.string().email('Invalid email'),
  documentType: z.enum(['D', 'R', 'C']),
  documentNumber: z.string().min(4, 'Enter a valid document'),
  firstName: z.string().min(2, 'Enter the first name'),
  fatherLastName: z.string().min(2, 'Enter the father surname'),
  motherLastName: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['A', 'I']),
})

export default function UsersPage() {
  const [statusFilter, setStatusFilter] = useState<'A' | 'I' | 'all'>('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [rolesOpen, setRolesOpen] = useState<User | null>(null)
  const [auditTarget, setAuditTarget] = useState<AuditTarget | null>(null)
  const [hardDeleteUser, setHardDeleteUser] = useState<User | null>(null)
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState('')
  const [resetPwUser, setResetPwUser] = useState<User | null>(null)
  const [resetPwValue, setResetPwValue] = useState('')
  const [resetPwLoading, setResetPwLoading] = useState(false)

  const { data, isLoading, isError, error } = useUsers({
    status: statusFilter === 'all' ? undefined : statusFilter,
    email: search || undefined,
  })

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const deleteUserHard = useDeleteUserHard()
  const resendVerification = useResendVerificationEmail()

  const users = data?.data ?? []
  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { documentType: 'D' },
  })
  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
  })

  const openEdit = (user: User) => {
    setEditing(user)
    editForm.reset({
      email: user.email,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      firstName: user.firstName,
      fatherLastName: user.fatherLastName,
      motherLastName: user.motherLastName ?? '',
      phone: user.phone ?? '',
      status: user.status,
    })
  }

  const onCreate = async (values: z.infer<typeof createSchema>) => {
    await createUser.mutateAsync(values)
    setCreateOpen(false)
    createForm.reset()
  }

  const onEdit = async (values: z.infer<typeof editSchema>) => {
    if (!editing) return
    await updateUser.mutateAsync({ userId: editing.userId, body: values })
    setEditing(null)
  }

  const onDelete = async (user: User) => {
    if (!confirm(`Deactivate user ${user.email}?`)) return
    await deleteUser.mutateAsync(user.userId)
  }

  const onHardDelete = (user: User) => {
    setHardDeleteUser(user)
    setHardDeleteConfirm('')
  }

  const confirmHardDelete = async () => {
    if (!hardDeleteUser) return
    await deleteUserHard.mutateAsync(hardDeleteUser.userId)
    setHardDeleteUser(null)
    setHardDeleteConfirm('')
  }

  const onResendVerification = async (user: User) => {
    if (user.emailVerified) return
    await resendVerification.mutateAsync(user.userId)
  }

  const onResetPassword = async () => {
    if (!resetPwUser || !resetPwValue || resetPwValue.length < 8) return
    setResetPwLoading(true)
    try {
      await adminResetPassword(resetPwUser.userId, resetPwValue)
      toast.success(`Password reset for ${resetPwUser.email}`)
      setResetPwUser(null)
      setResetPwValue('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password')
    } finally {
      setResetPwLoading(false)
    }
  }

  const mfaSummary = (mfa?: Record<string, { active: boolean; verified: boolean }>) => {
    if (!mfa) return null
    const active = Object.entries(mfa).filter(([, v]) => v.active).map(([k]) => k.toUpperCase())
    if (active.length === 0) return null
    return active.join(', ')
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Account management and role assignment"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New user
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              items={{
                all: 'All',
                A: 'Active',
                I: 'Inactive',
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="A">Active</SelectItem>
                <SelectItem value="I">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <EmptyState message={error instanceof Error ? error.message : 'Failed to load users'} />
          ) : users.length === 0 ? (
            <EmptyState message="No users found" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>MFA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {u.userId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {u.firstName} {u.fatherLastName} {u.motherLastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.documentType}-{u.documentNumber}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {u.emailVerified ? (
                          <CheckCircle className="size-4 text-green-600" />
                        ) : (
                          <XCircle className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {mfaSummary(u.mfa) ? (
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="size-3.5 text-green-600" />
                            {mfaSummary(u.mfa)}
                          </span>
                        ) : (
                          <ShieldOff className="size-3.5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setAuditTarget({
                                entity: 'user',
                                key: u.userId,
                                tenantId: u.tenantId ?? 1,
                                kind: `${u.firstName} ${u.fatherLastName}`,
                              })
                            }
                            title="View audit"
                          >
                            <History className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setRolesOpen(u)} title="Assign roles">
                            <UserCog className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setResetPwUser(u); setResetPwValue('') }}
                            title="Reset password"
                          >
                            <KeyRound className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          {!u.emailVerified && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onResendVerification(u)}
                              disabled={resendVerification.isPending}
                              title="Resend verification email"
                            >
                              <MailCheck className="size-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button variant="ghost" size="icon" title="Delete options" className="text-destructive">
                                <Trash2 className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onDelete(u)}>
                                Deactivate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => onHardDelete(u)}>
                                Delete permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>Fields marked with * are required.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" autoComplete="off" placeholder="usuario@greip.com.pe" {...createForm.register('email')} />
              {createForm.formState.errors.email && (
                <p className="text-sm text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Document type *</Label>
                <Select
                  defaultValue="D"
                  onValueChange={(v) => createForm.setValue('documentType', v as 'D' | 'R' | 'C')}
                  items={{ D: 'DNI', R: 'RUC', C: 'Carné' }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D">DNI</SelectItem>
                    <SelectItem value="R">RUC</SelectItem>
                    <SelectItem value="C">Carné</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document number *</Label>
                <Input placeholder="00000000" {...createForm.register('documentNumber')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First name *</Label>
                <Input {...createForm.register('firstName')} />
              </div>
              <div className="space-y-2">
                <Label>Father last name *</Label>
                <Input {...createForm.register('fatherLastName')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mother last name</Label>
                <Input {...createForm.register('motherLastName')} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...createForm.register('phone')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Initial password *</Label>
              <Input type="password" {...createForm.register('password')} />
              {createForm.formState.errors.password && (
                <p className="text-sm text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending && <Loader2 className="size-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" {...editForm.register('email')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Document type</Label>
                  <Select
                    value={editForm.watch('documentType')}
                    onValueChange={(v) => editForm.setValue('documentType', v as 'D' | 'R' | 'C')}
                    items={{ D: 'DNI', R: 'RUC', C: 'Carné' }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="D">DNI</SelectItem>
                      <SelectItem value="R">RUC</SelectItem>
                      <SelectItem value="C">Carné</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Document number</Label>
                  <Input {...editForm.register('documentNumber')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input {...editForm.register('firstName')} />
                </div>
                <div className="space-y-2">
                  <Label>Father last name</Label>
                  <Input {...editForm.register('fatherLastName')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mother last name</Label>
                  <Input {...editForm.register('motherLastName')} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input {...editForm.register('phone')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.watch('status')}
                  onValueChange={(v) => editForm.setValue('status', v as 'A' | 'I')}
                  items={{ A: 'Active', I: 'Inactive' }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Active</SelectItem>
                    <SelectItem value="I">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending && <Loader2 className="size-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(hardDeleteUser)} onOpenChange={(o) => !o && (setHardDeleteUser(null), setHardDeleteConfirm(''))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete permanently</DialogTitle>
            <DialogDescription>
              This action will permanently erase all data for{' '}
              <strong>{hardDeleteUser?.email}</strong> including their profile,
              sessions, MFA factors, roles, person record, and audit history.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type the email to confirm</Label>
              <Input
                placeholder={hardDeleteUser?.email}
                value={hardDeleteConfirm}
                onChange={(e) => setHardDeleteConfirm(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setHardDeleteUser(null); setHardDeleteConfirm(''); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={hardDeleteConfirm !== hardDeleteUser?.email || deleteUserHard.isPending}
                onClick={confirmHardDelete}
              >
                {deleteUserHard.isPending && <Loader2 className="size-4 animate-spin" />}
                Delete permanently
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AssignRolesDialog user={rolesOpen} onClose={() => setRolesOpen(null)} />
      <AuditDialog target={auditTarget} onClose={() => setAuditTarget(null)} />

      <Dialog open={Boolean(resetPwUser)} onOpenChange={(o) => !o && setResetPwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetPwUser && `Enter a new password for ${resetPwUser.firstName} ${resetPwUser.fatherLastName} (${resetPwUser.email}).`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New password (min 8 characters)</Label>
              <Input
                type="password"
                placeholder="New password"
                value={resetPwValue}
                onChange={(e) => setResetPwValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPwUser(null)}>Cancel</Button>
              <Button onClick={onResetPassword} disabled={resetPwLoading || resetPwValue.length < 8}>
                {resetPwLoading && <Loader2 className="size-4 animate-spin" />}
                Reset password
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AssignRolesDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { data: rolesData } = useRoles()
  const { data: detailData } = useGetUserDetail(user ? user.userId : null)
  const assign = useAssignRoles()
  const [selected, setSelected] = useState<number[]>([])
  const roles = rolesData ?? []
  const currentRoles = detailData?.roles ?? []

  useEffect(() => {
    if (currentRoles.length > 0) {
      setSelected(currentRoles.map((r) => r.id))
    }
  }, [currentRoles])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setSelected([])
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign roles</DialogTitle>
          <DialogDescription>
            {user ? `Select the roles for ${user.firstName} ${user.fatherLastName}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {roles.length === 0 && <p className="text-sm text-muted-foreground">No roles created.</p>}
          {roles.map((r) => (
            <label
              key={r.id}
              className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/60"
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selected.includes(r.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id),
                  )
                }
              />
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.description ?? r.code}</p>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={assign.isPending || !user}
            onClick={async () => {
              if (!user) return
              await assign.mutateAsync({ userId: user.userId, roles: selected })
              handleOpenChange(false)
            }}
          >
            {assign.isPending && <Loader2 className="size-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
