import { Link } from 'react-router-dom'
import {
  CircleUserRound,
  Shield,
  Boxes,
  History,
  Mail,
  Lock,
  FileClock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { PageHeader } from '@/components/common'
import { formatDate } from '@/components/common'
import { useDashboardSummary } from '@/hooks/queries'

const modules = [
  {
    to: '/usuarios',
    title: 'Users',
    description: 'User management and role assignment',
    icon: CircleUserRound,
  },
  {
    to: '/roles',
    title: 'Roles',
    description: 'System roles catalog',
    icon: Shield,
  },
  {
    to: '/permisos',
    title: 'Permissions',
    description: 'Available permissions per role',
    icon: Lock,
  },
  {
    to: '/productos',
    title: 'Products',
    description: 'Products catalog (CRUD)',
    icon: Boxes,
  },
  {
    to: '/auditoria',
    title: 'Audit',
    description: 'Entity change history',
    icon: History,
  },
  {
    to: '/cross',
    title: 'Notifications',
    description: 'Email and SMS delivery, data encryption',
    icon: Mail,
  },
]

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const tenantId = user?.tenantId ?? 1
  const { data: summary } = useDashboardSummary(tenantId)

  const stats = [
    { label: 'Active users', value: summary?.users.active, icon: CircleUserRound },
    { label: 'Roles', value: summary?.roles.active, icon: Shield },
    { label: 'Permissions', value: summary?.permissions.active, icon: Lock },
    { label: 'Products', value: summary?.products.active, icon: Boxes },
  ]

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.firstName ?? ''} 👋`}
        description={
          user?.createdAt
            ? `Account created on ${formatDate(user.createdAt)}`
            : 'GREIP services administration panel'
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{modules.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              APIs consumed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">3</p>
            <p className="text-xs text-muted-foreground">security · catalogs · cross</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">AppWeb</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Audit events (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <FileClock className="size-4 text-primary" />
            <p className="text-2xl font-semibold">{summary?.audit.last24h ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              <p className="text-2xl font-semibold">{value ?? '—'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
