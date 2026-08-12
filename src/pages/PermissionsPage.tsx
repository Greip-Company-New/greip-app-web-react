import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, PageHeader, StatusBadge } from '@/components/common'
import type { Permission } from '@/lib/types'
import {
  useCreatePermission,
  useDeletePermission,
  usePermissions,
  useUpdatePermission,
} from '@/hooks/queries'

const baseSchema = z.object({
  code: z.string().min(2, 'Enter the code'),
  name: z.string().min(2, 'Enter the name'),
  description: z.string().optional(),
})

const createSchema = baseSchema
const editSchema = baseSchema.extend({
  status: z.enum(['A', 'I']),
})

export default function PermissionsPage() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Permission | null>(null)
  const { data, isLoading, isError } = usePermissions()
  const createPermission = useCreatePermission()
  const updatePermission = useUpdatePermission()
  const deletePermission = useDeletePermission()
  const permissions = data ?? []

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
  })
  const editForm = useForm<z.infer<typeof editSchema>>({ resolver: zodResolver(editSchema) })

  const openEdit = (p: Permission) => {
    setEditing(p)
    editForm.reset({
      code: p.code,
      name: p.name,
      description: p.description ?? '',
      status: p.status === 'I' ? 'I' : 'A',
    })
  }

  const onCreate = async (values: z.infer<typeof createSchema>) => {
    await createPermission.mutateAsync(values)
    setOpen(false)
    createForm.reset()
  }

  const onEdit = async (values: z.infer<typeof editSchema>) => {
    if (!editing) return
    const { code, ...rest } = values
    await updatePermission.mutateAsync({ permissionId: String(editing.id), body: rest })
    setEditing(null)
  }

  const onDelete = async (p: Permission) => {
    if (!confirm(`Delete permission ${p.code}?`)) return
    await deletePermission.mutateAsync(String(p.id))
  }

  return (
    <>
      <PageHeader
        title="Permissions"
        description="Permissions available to assign to roles"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New permission
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <EmptyState message="Failed to load permissions" />
          ) : permissions.length === 0 ? (
            <EmptyState message="No permissions registered" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.description ?? '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(p)}
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
            <DialogTitle>New permission</DialogTitle>
            <DialogDescription>Create a permission to assign to roles.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input placeholder="E.g. user.read" {...createForm.register('code')} />
              {createForm.formState.errors.code && (
                <p className="text-sm text-destructive">{createForm.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Read users" {...createForm.register('name')} />
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
              <Button type="submit" disabled={createPermission.isPending}>
                {createPermission.isPending && <Loader2 className="size-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit permission</DialogTitle>
            <DialogDescription>Update the permission information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input placeholder="E.g. user.read" disabled {...editForm.register('code')} />
              {editForm.formState.errors.code && (
                <p className="text-sm text-destructive">{editForm.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Read users" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...editForm.register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePermission.isPending}>
                {updatePermission.isPending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}