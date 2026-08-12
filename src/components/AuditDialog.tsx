import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common'
import ChangeLogTable from '@/components/ChangeLogTable'
import { useAudit } from '@/hooks/queries'

export interface AuditTarget {
  entity: 'user' | 'product' | 'role' | 'tenant'
  key: string
  tenantId: number | string
  kind: string
}

export default function AuditDialog({
  target,
  onClose,
}: {
  target: AuditTarget | null
  onClose: () => void
}) {
  const { data, isLoading, isError, error } = useAudit(
    target
      ? {
          entity: target.entity,
          entityKey: target.key,
          tenantId: String(target.tenantId),
        }
      : undefined,
  )

  const logs = data?.data ?? []

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="xl"
        className="flex max-h-[90dvh] flex-col overflow-hidden"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Audit of {target?.kind}</DialogTitle>
          <DialogDescription>
            Key: <span className="font-mono text-muted-foreground">{target?.key}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <EmptyState
              message={error instanceof Error ? error.message : 'Failed to load audit'}
            />
          ) : (
            <ChangeLogTable logs={logs} showUser showChannel />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}