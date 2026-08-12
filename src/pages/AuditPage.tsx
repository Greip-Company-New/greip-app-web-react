import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import ChangeLogTable from '@/components/ChangeLogTable'
import { useAudit } from '@/hooks/queries'
import { useAuthStore } from '@/stores/auth'

type EntityType = 'user' | 'product' | 'role' | 'tenant'

interface AuditParams {
  entity: EntityType
  entityKey: string
  tenantId: string
  action?: string
}

const KEY_HINTS: Record<EntityType, string> = {
  user: 'User ID (find it in the Users table)',
  product: 'Product ID (find it in the Products table)',
  role: 'Role ID (find it in the Roles table)',
  tenant: 'Tenant ID (find it in the Tenants table)',
}

export default function AuditPage() {
  const sessionUser = useAuthStore((s) => s.user)
  const sessionTenantId = String(sessionUser?.tenantId ?? 1)

  const [entityType, setEntityType] = useState<EntityType | 'none'>('none')
  const [entityKey, setEntityKey] = useState('')
  const [action, setAction] = useState('')
  const [params, setParams] = useState<AuditParams | null>(null)

  const { data, isLoading, isError, error } = useAudit(
    params
      ? {
          entity: params.entity,
          entityKey: params.entityKey,
          tenantId: params.tenantId,
          action: params.action,
        }
      : undefined,
  )

  const logs = data?.data ?? []

  const handleTypeChange = (value: EntityType | 'none' | null) => {
    setEntityType(value ?? 'none')
    setEntityKey('')
    setParams(null)
  }

  const handleSearch = () => {
    if (entityType === 'none' || !entityKey.trim()) return
    setParams({
      entity: entityType,
      entityKey: entityKey.trim(),
      tenantId: sessionTenantId,
      action: action.trim() || undefined,
    })
  }

  const handleClear = () => {
    setEntityType('none')
    setEntityKey('')
    setAction('')
    setParams(null)
  }

  return (
    <>
      <PageHeader
        title="Audit"
        description="Change history of an entity (user, product, role or tenant)"
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Entity</Label>
              <Select
                value={entityType}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity key</Label>
              <Input
                placeholder="Enter the key"
                value={entityKey}
                onChange={(e) => setEntityKey(e.target.value)}
                disabled={entityType === 'none'}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {entityType !== 'none' && (
                <p className="text-xs text-muted-foreground">{KEY_HINTS[entityType]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Action (filter)</Label>
              <Input
                placeholder="CREATE, UPDATE, DELETE..."
                value={action}
                onChange={(e) => setAction(e.target.value)}
                disabled={entityType === 'none'}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={entityType === 'none' || !entityKey.trim()}>
                <Search className="size-4" /> Search
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {params && (
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError ? (
              <EmptyState message={error instanceof Error ? error.message : 'Failed to load audit'} />
            ) : (
              <ChangeLogTable logs={logs} showUser showChannel />
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
