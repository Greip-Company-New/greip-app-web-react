import { useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { History, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
import { EmptyState, formatCurrency, PageHeader, StatusBadge } from '@/components/common'
import AuditDialog, { type AuditTarget } from '@/components/AuditDialog'
import type { Product } from '@/lib/types'
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from '@/hooks/queries'

const schema = z.object({
  name: z.string().min(2, 'Enter the name'),
  description: z.string().optional(),
  price: z.coerce.number({ error: 'Enter a valid price' }).positive('Price must be greater than 0'),
  currency: z.enum(['PEN', 'USD']),
  status: z.enum(['A', 'I']),
})

type ProductFormValues = z.input<typeof schema>
type ProductSubmitValues = z.output<typeof schema>

export default function ProductsPage() {
  const [statusFilter, setStatusFilter] = useState<'A' | 'I' | 'all'>('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [auditTarget, setAuditTarget] = useState<AuditTarget | null>(null)

  const { data, isLoading, isError, error } = useProducts({
    status: statusFilter === 'all' ? undefined : statusFilter,
    name: search || undefined,
  })
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const products = data?.data ?? []
  const createForm = useForm<ProductFormValues, any, ProductSubmitValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'PEN', status: 'A' },
  })
  const editForm = useForm<ProductFormValues, any, ProductSubmitValues>({
    resolver: zodResolver(schema),
  })

  const openEdit = (p: Product) => {
    setEditing(p)
    editForm.reset({
      name: p.name,
      description: p.description ?? '',
      price: p.price,
      currency: p.currency,
      status: p.status,
    })
  }

  const onCreate = async (values: ProductSubmitValues) => {
    await createProduct.mutateAsync(values)
    setCreateOpen(false)
    createForm.reset({ currency: 'PEN', status: 'A' })
  }

  const onEdit = async (values: ProductSubmitValues) => {
    if (!editing) return
    await updateProduct.mutateAsync({ productId: editing.productId, body: values })
    setEditing(null)
  }

  const onDelete = async (p: Product) => {
    if (!confirm(`Delete product "${p.name}"?`)) return
    await deleteProduct.mutateAsync(p.productId)
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="Products catalog (service-catalogs)"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New product
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by name..."
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
            <EmptyState message={error instanceof Error ? error.message : 'Failed to load products'} />
          ) : products.length === 0 ? (
            <EmptyState message="No products found" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.productId}
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">
                        {p.description ?? '—'}
                      </TableCell>
                      <TableCell>{formatCurrency(p.price, p.currency)}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setAuditTarget({
                                entity: 'product',
                                key: String(p.productId),
                                tenantId: p.tenantId ?? 1,
                                kind: p.name,
                              })
                            }
                            title="View audit"
                          >
                            <History className="size-4" />
                          </Button>
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

      <ProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New product"
        description="Register a product in the catalog."
        form={createForm}
        onSubmit={onCreate}
        isPending={createProduct.isPending}
      />

      <ProductDialog
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit product"
        description="Update the product information."
        form={editForm}
        onSubmit={onEdit}
        isPending={updateProduct.isPending}
      />
      <AuditDialog target={auditTarget} onClose={() => setAuditTarget(null)} />
    </>
  )
}

function ProductDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  form: UseFormReturn<ProductFormValues, any, ProductSubmitValues>
  onSubmit: (values: ProductSubmitValues) => Promise<void>
  isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input placeholder="Product name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Optional description" {...form.register('description')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Price *</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...form.register('price')} />
              {form.formState.errors.price && (
                <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.watch('currency')}
                onValueChange={(v) => form.setValue('currency', v as 'PEN' | 'USD')}
                items={{ PEN: 'PEN', USD: 'USD' }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PEN">PEN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as 'A' | 'I')}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
