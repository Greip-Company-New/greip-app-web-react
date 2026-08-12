import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  Building,
  ChevronDown,
  CircleUserRound,
  History,
  Lock,
  LogOut,
  Menu,
  Shield,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import { logout } from '@/api/security'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

interface NavModule {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

const menuModules: NavModule[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    items: [{ to: '/', label: 'Dashboard', icon: BarChart3, permission: 'dashboard.read' }],
  },
  {
    key: 'seguridad',
    label: 'Users & Security',
    icon: Shield,
    items: [
      { to: '/usuarios', label: 'Users', icon: CircleUserRound, permission: 'user.read' },
      { to: '/roles', label: 'Roles', icon: Shield, permission: 'role.manage' },
      { to: '/permisos', label: 'Permissions', icon: Lock, permission: 'permission.read' },
      { to: '/auditoria', label: 'Audit', icon: History, permission: 'audit.read' },
    ],
  },
  {
    key: 'catalogo',
    label: 'Sales & Catalog',
    icon: Boxes,
    items: [
      { to: '/productos', label: 'Products', icon: Boxes, permission: 'product.read' },
      { to: '/tenants', label: 'Companies', icon: Building, permission: 'tenant.manage' },
    ],
  },
]

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 py-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Building2 className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">GREIP Company</p>
        <p className="text-xs text-muted-foreground">Services portal</p>
      </div>
    </div>
  )
}

function Nav() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleModule = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <nav className="flex flex-col gap-1 px-2 py-2">
      {menuModules.map((mod) => {
        const visible = mod.items.filter(
          (item) => !item.permission || hasPermission(item.permission),
        )
        if (visible.length === 0) return null

        // Dashboard module: single item, no collapse
        if (mod.key === 'dashboard') {
          return (
            <div key={mod.key} className="mb-1">
              {visible.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          )
        }

        // Module with multiple items: collapsible
        const isOpen = !collapsed[mod.key]
        const hasActive = visible.some((v) => location.pathname === v.to || (v.to !== '/' && location.pathname.startsWith(v.to)))

        return (
          <div key={mod.key}>
            <button
              type="button"
              onClick={() => toggleModule(mod.key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                hasActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <mod.icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{mod.label}</span>
              <ChevronDown
                className={cn(
                  'size-3.5 shrink-0 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
            {isOpen && (
              <div className="ml-3 border-l pl-3 space-y-0.5 mt-0.5">
                {visible.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function UserFooter() {
  const user = useAuthStore((s) => s.user)
  const setLogout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleLogout = async () => {
    try {
      const rt = useAuthStore.getState().refreshToken
      if (rt) await logout(rt)
    } catch {
      // noop: the local session is cleared anyway
    } finally {
      setLogout()
      navigate('/login')
    }
  }

  return (
    <div className="mt-auto border-t p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/10 text-primary">
            {user?.firstName?.[0] ?? 'G'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 leading-tight">
          <button
            type="button"
            onClick={() => navigate('/mi-perfil')}
            className="truncate text-sm font-medium hover:underline cursor-pointer text-left w-full"
          >
            {user?.firstName} {user?.fatherLastName}
          </button>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmOpen(true)}
          title="Log out"
        >
          <LogOut className="size-4" />
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log out</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You will need to sign in again to access the
              portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" /> Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background lg:flex">
        <Brand />
        <Separator />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <Nav />
          <UserFooter />
        </div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="icon" className="fixed left-3 top-3 z-40 lg:hidden">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <Brand />
          <Separator />
          <div className="flex flex-1 flex-col overflow-y-auto">
            <Nav />
            <UserFooter />
          </div>
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 pt-16 sm:px-6 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
