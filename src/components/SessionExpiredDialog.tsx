import { useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { resetSessionExpiredNotified } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

export default function SessionExpiredDialog() {
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogin = () => {
    logout()
    resetSessionExpiredNotified()
    navigate('/login', { replace: true })
  }

  return (
    <Dialog open={sessionExpired} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="size-5" />
          </div>
          <DialogTitle className="mt-2">Session expired</DialogTitle>
          <DialogDescription>
            Your session has expired. Please log in again to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton={false}>
          <Button onClick={handleLogin} className="w-full sm:w-auto">
            Go to login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}