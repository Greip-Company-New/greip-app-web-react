import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Pencil, Plus, Power, Settings2, History } from 'lucide-react'
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
import NotificationProvidersSection from '@/components/NotificationProvidersSection'
import AuditDialog, { type AuditTarget } from '@/components/AuditDialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationProvider, Tenant } from '@/lib/types'
import { getProviderConfig, updateProviderConfig } from '@/api/thyrd'
import {
  useCreateTenant,
  useDeactivateTenant,
  usePaises,
  useTenants,
  useUpdateTenant,
} from '@/hooks/queries'

const PAISES_FALLBACK: Array<{ id: number; name_es: string }> = [
  { id: 1, name_es: 'Argentina' },
  { id: 2, name_es: 'Bolivia' },
  { id: 3, name_es: 'Brasil' },
  { id: 4, name_es: 'Canadá' },
  { id: 5, name_es: 'Chile' },
  { id: 6, name_es: 'Colombia' },
  { id: 7, name_es: 'Costa Rica' },
  { id: 8, name_es: 'Cuba' },
  { id: 9, name_es: 'Ecuador' },
  { id: 10, name_es: 'El Salvador' },
  { id: 11, name_es: 'España' },
  { id: 12, name_es: 'Estados Unidos' },
  { id: 13, name_es: 'Guatemala' },
  { id: 14, name_es: 'Honduras' },
  { id: 15, name_es: 'México' },
  { id: 16, name_es: 'Nicaragua' },
  { id: 17, name_es: 'Panamá' },
  { id: 18, name_es: 'Paraguay' },
  { id: 19, name_es: 'Perú' },
  { id: 20, name_es: 'República Dominicana' },
  { id: 21, name_es: 'Uruguay' },
  { id: 22, name_es: 'Venezuela' },
]

const createSchema = z.object({
  code: z.string().min(2, 'Enter the code'),
  name: z.string().min(2, 'Enter the name'),
  ruc: z.string().optional(),
  razon_social: z.string().optional(),
  idioma: z.enum(['es', 'en']).optional(),
  moneda: z.enum(['PEN', 'USD']).optional(),
  formato_fecha: z.string().optional(),
  formato_fecha_hora: z.string().optional(),
  formato_decimales: z.string().optional(),
  admin_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  admin_password: z.string().optional(),
  admin_first_name: z.string().optional(),
  admin_father_last_name: z.string().optional(),
})

const editSchema = z.object({
  name: z.string().min(2, 'Enter the name'),
  ruc: z.string().optional(),
  razon_social: z.string().optional(),
  idioma: z.enum(['es', 'en']).optional(),
  moneda: z.enum(['PEN', 'USD']).optional(),
  formato_fecha: z.string().optional(),
  formato_fecha_hora: z.string().optional(),
  formato_decimales: z.string().optional(),
  status: z.enum(['A', 'I']),
})

export default function TenantsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)
  const [providerTenant, setProviderTenant] = useState<Tenant | null>(null)
  const [auditTarget, setAuditTarget] = useState<AuditTarget | null>(null)
  const [emailProvider, setEmailProvider] = useState<NotificationProvider>('BREVO')
  const [smsProvider, setSmsProvider] = useState<NotificationProvider>('BREVO')
  const [createPaisId, setCreatePaisId] = useState<string>('')
  const [editPaisId, setEditPaisId] = useState<string>('')

  const { data, isLoading, isError, error, refetch } = useTenants()
  const { data: paisesData } = usePaises()
  const paises = (paisesData && paisesData.length > 0) ? paisesData : PAISES_FALLBACK
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const deactivateTenant = useDeactivateTenant()
  const tenants = data ?? []

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
  })
  const editForm = useForm<z.infer<typeof editSchema>>({ resolver: zodResolver(editSchema) })

  const { data: editConfig } = useQuery({
    queryKey: ['provider-config', editTenant?.code],
    queryFn: () => getProviderConfig(editTenant!.code),
    enabled: Boolean(editTenant),
  })

  useEffect(() => {
    if (editConfig) {
      setEmailProvider(editConfig.emailProvider)
      setSmsProvider(editConfig.smsProvider)
    }
  }, [editConfig])

  const openEdit = (tenant: Tenant) => {
    setEditTenant(tenant)
    setEmailProvider('BREVO')
    setSmsProvider('BREVO')
    setEditPaisId(tenant.pais_id ? String(tenant.pais_id) : '')
    editForm.reset({
      name: tenant.name,
      ruc: tenant.ruc ?? '',
      razon_social: tenant.razon_social ?? '',
      idioma: (tenant.idioma as 'es' | 'en') ?? 'es',
      moneda: (tenant.moneda as 'PEN' | 'USD') ?? 'PEN',
      formato_fecha: tenant.formato_fecha ?? 'DD/MM/YYYY',
      formato_fecha_hora: tenant.formato_fecha_hora ?? 'DD/MM/YYYY HH:mm',
      formato_decimales: tenant.formato_decimales ?? '#,##0.00',
      status: tenant.status === 'I' ? 'I' : 'A',
    })
  }

  const invalidateProviderConfig = () =>
    qc.invalidateQueries({ queryKey: ['provider-config'] })

  const onCreate = async (values: z.infer<typeof createSchema>) => {
    const tenant = await createTenant.mutateAsync({
      code: values.code,
      name: values.name,
      ruc: values.ruc || undefined,
      razon_social: values.razon_social || undefined,
      pais_id: createPaisId ? Number(createPaisId) : undefined,
      idioma: values.idioma,
      moneda: values.moneda,
      formato_fecha: values.formato_fecha || undefined,
      formato_fecha_hora: values.formato_fecha_hora || undefined,
      formato_decimales: values.formato_decimales || undefined,
      admin_email: values.admin_email || undefined,
      admin_password: values.admin_password || undefined,
      admin_first_name: values.admin_first_name || undefined,
      admin_father_last_name: values.admin_father_last_name || undefined,
    })
    try {
      await updateProviderConfig({ emailProvider, smsProvider }, tenant.code)
      toast.success('Notification provider configured')
    } catch (e) {
      toast.warning(
        `Provider not saved: ${e instanceof Error ? e.message : 'unknown error'}`,
      )
    }
    await invalidateProviderConfig()
    setOpen(false)
    createForm.reset()
    setCreatePaisId('')
  }

  const onEdit = async (values: z.infer<typeof editSchema>) => {
    if (!editTenant) return
    await updateTenant.mutateAsync({
      tenantId: String(editTenant.id),
      body: {
        name: values.name,
        ruc: values.ruc || undefined,
        razon_social: values.razon_social || undefined,
        pais_id: editPaisId ? Number(editPaisId) : undefined,
        idioma: values.idioma,
        moneda: values.moneda,
        formato_fecha: values.formato_fecha || undefined,
        formato_fecha_hora: values.formato_fecha_hora || undefined,
        formato_decimales: values.formato_decimales || undefined,
        status: values.status,
      },
    })
    try {
      await updateProviderConfig({ emailProvider, smsProvider }, editTenant.code)
      toast.success('Notification provider saved')
    } catch (e) {
      toast.warning(
        `Provider not saved: ${e instanceof Error ? e.message : 'unknown error'}`,
      )
    }
    await invalidateProviderConfig()
    setEditTenant(null)
  }

  const onDeactivate = async (tenant: Tenant) => {
    if (!confirm(`Deactivate tenant ${tenant.name} (${tenant.code})?`)) return
    await deactivateTenant.mutateAsync(String(tenant.id))
  }

  return (
    <>
      <PageHeader
        title="Tenants"
        description="Companies catalog. Each tenant configures its notification provider."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New tenant
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
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <div className="flex-1 space-y-1">
                <p className="font-medium">Failed to load tenants</p>
                {error && (
                  <p className="text-xs opacity-80">
                    {error instanceof Error ? error.message : String(error)}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : tenants.length === 0 ? (
            <EmptyState message="No tenants registered" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Notification provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {t.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{t.code}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {paises.find((p) => p.id === t.pais_id)?.name_es ?? '—'}
                      </TableCell>
                      <TableCell>
                        <TenantProviderCell tenantCode={t.code} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setAuditTarget({
                                entity: 'tenant',
                                key: String(t.id),
                                tenantId: t.id,
                                kind: t.code,
                              })
                            }
                            title="Audit"
                          >
                            <History className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setProviderTenant(t)}
                            title="Notification providers"
                          >
                            <Settings2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(t)}
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {t.status === 'A' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeactivate(t)}
                              title="Deactivate"
                              className="text-destructive"
                            >
                              <Power className="size-4" />
                            </Button>
                          )}
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
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New tenant</DialogTitle>
            <DialogDescription>Register a new company (tenant).</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input placeholder="E.g. EMPRESA01" {...createForm.register('code')} />
                {createForm.formState.errors.code && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="Company name" {...createForm.register('name')} />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>RUC / Tax ID</Label>
                <Input maxLength={11} placeholder="11 digits" {...createForm.register('ruc')} />
              </div>
              <div className="space-y-2">
                <Label>Razón social</Label>
                <Input placeholder="Legal name" {...createForm.register('razon_social')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={createPaisId} onValueChange={(v) => setCreatePaisId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {paises.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name_es}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={createForm.watch('idioma') ?? 'es'}
                  onValueChange={(v) => createForm.setValue('idioma', v as 'es' | 'en')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={createForm.watch('moneda') ?? 'PEN'}
                  onValueChange={(v) => createForm.setValue('moneda', v as 'PEN' | 'USD')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">PEN — Soles</SelectItem>
                    <SelectItem value="USD">USD — Dólares</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Date format</Label>
                <Input placeholder="DD/MM/YYYY" {...createForm.register('formato_fecha')} />
              </div>
              <div className="space-y-2">
                <Label>Date & time format</Label>
                <Input placeholder="DD/MM/YYYY HH:mm" {...createForm.register('formato_fecha_hora')} />
              </div>
              <div className="space-y-2">
                <Label>Decimal format</Label>
                <Input placeholder="#,##0.00" {...createForm.register('formato_decimales')} />
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium">Admin user (optional — created automatically)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Admin email</Label>
                <Input type="email" placeholder="admin@company.com" {...createForm.register('admin_email')} />
              </div>
              <div className="space-y-2">
                <Label>Admin password</Label>
                <Input type="password" placeholder="Min 8 characters" {...createForm.register('admin_password')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input placeholder="Admin" {...createForm.register('admin_first_name')} />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input placeholder="Company" {...createForm.register('admin_father_last_name')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTenant.isPending}>
                {createTenant.isPending && <Loader2 className="size-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTenant)} onOpenChange={(o) => !o && setEditTenant(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit tenant</DialogTitle>
            <DialogDescription>Update the tenant information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input disabled value={editTenant?.code ?? ''} />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="Company name" {...editForm.register('name')} />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>RUC / Tax ID</Label>
                <Input maxLength={11} placeholder="11 digits" {...editForm.register('ruc')} />
              </div>
              <div className="space-y-2">
                <Label>Razón social</Label>
                <Input placeholder="Legal name" {...editForm.register('razon_social')} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={editPaisId} onValueChange={(v) => setEditPaisId(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {paises.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name_es}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={editForm.watch('idioma') ?? 'es'}
                  onValueChange={(v) => editForm.setValue('idioma', v as 'es' | 'en')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={editForm.watch('moneda') ?? 'PEN'}
                  onValueChange={(v) => editForm.setValue('moneda', v as 'PEN' | 'USD')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">PEN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.watch('status')}
                  onValueChange={(v) => editForm.setValue('status', v as 'A' | 'I')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Active</SelectItem>
                    <SelectItem value="I">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Date format</Label>
                <Input placeholder="DD/MM/YYYY" {...editForm.register('formato_fecha')} />
              </div>
              <div className="space-y-2">
                <Label>Date & time format</Label>
                <Input placeholder="DD/MM/YYYY HH:mm" {...editForm.register('formato_fecha_hora')} />
              </div>
              <div className="space-y-2">
                <Label>Decimal format</Label>
                <Input placeholder="#,##0.00" {...editForm.register('formato_decimales')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTenant(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTenant.isPending}>
                {updateTenant.isPending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(providerTenant)} onOpenChange={(o) => !o && setProviderTenant(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Notification providers</DialogTitle>
            <DialogDescription>
              Configure the notification provider for this company (tenant).
              {providerTenant && (
                <span className="mt-1 block font-medium">
                  {providerTenant.name} ({providerTenant.code})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {providerTenant && (
            <NotificationProvidersSection
              tenantCode={providerTenant.code}
              tenantName={providerTenant.name}
            />
          )}
        </DialogContent>
      </Dialog>

      <AuditDialog target={auditTarget} onClose={() => setAuditTarget(null)} />
    </>
  )
}

function TenantProviderCell({ tenantCode }: { tenantCode: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['provider-config', tenantCode],
    queryFn: () => getProviderConfig(tenantCode),
    enabled: Boolean(tenantCode),
  })

  if (isLoading) return <span className="text-xs text-muted-foreground">…</span>
  if (!data) return <span className="text-xs text-muted-foreground">—</span>

  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="outline">Email: {data.emailProvider}</Badge>
      <Badge variant="outline">SMS: {data.smsProvider}</Badge>
    </div>
  )
}