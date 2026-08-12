import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState, formatDate } from '@/components/common'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { EntityChangeLog } from '@/lib/types'

export function actionVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (action?.toUpperCase()) {
    case 'CREATE':
    case 'INSERT':
      return 'default'
    case 'UPDATE':
      return 'secondary'
    case 'DELETE':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default function ChangeLogTable({
  logs,
  showUser = false,
  showChannel = false,
}: {
  logs: EntityChangeLog[]
  showUser?: boolean
  showChannel?: boolean
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (logs.length === 0) {
    return <EmptyState message="No movements registered" />
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Change</TableHead>
            {showUser && <TableHead>User</TableHead>}
            {showChannel && <TableHead>Channel</TableHead>}
            <TableHead>IP</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <ChangeRow
              key={log.id}
              log={log}
              showUser={showUser}
              showChannel={showChannel}
              expanded={expanded === log.id}
              onToggle={() => setExpanded((prev) => (prev === log.id ? null : log.id))}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ChangeRow({
  log,
  expanded,
  onToggle,
  showUser,
  showChannel,
}: {
  log: EntityChangeLog
  expanded: boolean
  onToggle: () => void
  showUser: boolean
  showChannel: boolean
}) {
  const changeCount = log.changes ? Object.keys(log.changes).length : 0

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDate(log.created_at)}
        </TableCell>
        <TableCell>
          <Badge variant={actionVariant(log.action)}>{log.action ?? log.change_type}</Badge>
        </TableCell>
        <TableCell>
          {changeCount > 0 ? `${changeCount} field(s)` : log.change_type ?? '—'}
        </TableCell>
        {showUser && (
          <TableCell>
            {log.user_first_name} {log.user_father_last_name}
          </TableCell>
        )}
        {showChannel && <TableCell className="text-muted-foreground">{log.channel}</TableCell>}
        <TableCell className="font-mono text-xs text-muted-foreground">
          {log.source_ip}
        </TableCell>
        <TableCell>
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={showUser && showChannel ? 7 : showUser || showChannel ? 6 : 5} className="bg-muted/40">
            <div className="space-y-2 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Change details
              </p>
              {changeCount === 0 ? (
                <p className="text-sm text-muted-foreground">No field details.</p>
              ) : (
                <div className="grid gap-2">
                  {Object.entries(log.changes).map(([campo, valor]) => (
                    <div
                      key={campo}
                      className="grid gap-1 rounded-md border bg-background p-2 text-sm sm:grid-cols-[120px_1fr_1fr]"
                    >
                      <span className="font-mono text-xs font-medium text-primary">{campo}</span>
                      <ChangeValue label="Before" value={(valor as { before?: unknown })?.before} />
                      <ChangeValue label="After" value={(valor as { after?: unknown })?.after} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function ChangeValue({ label, value }: { label: string; value: unknown }) {
  const text = Array.isArray(value)
    ? value.join(', ')
    : value === null || value === undefined
      ? '—'
      : String(value)
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={text === '—' ? 'text-muted-foreground' : 'font-medium'}>{text}</p>
    </div>
  )
}