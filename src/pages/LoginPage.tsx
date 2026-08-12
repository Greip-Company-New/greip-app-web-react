import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { login, verifyMfa, switchMfaChannel } from '@/api/security'
import { ensureAutoRefresh } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Enter your email or document'),
  password: z.string().min(1, 'Enter your password'),
  identifierType: z.enum(['email', 'document']),
})

type LoginForm = z.infer<typeof loginSchema>

const mfaSchema = z.object({
  code: z.string().min(4, 'Enter the verification code'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const setSession = useAuthStore((s) => s.setSession)
  const setMfa = useAuthStore((s) => s.setMfa)
  const mfa = useAuthStore((s) => s.mfa)
  const [loading, setLoading] = useState(false)
  const [switchingChannel, setSwitchingChannel] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifierType: 'email' },
  })
  const identifierType = watch('identifierType')

  const mfaForm = useForm<z.infer<typeof mfaSchema>>({
    resolver: zodResolver(mfaSchema),
  })

  const onLogin = async (values: LoginForm) => {
    setLoading(true)
    try {
      const body =
        values.identifierType === 'email'
          ? { email: values.identifier, password: values.password }
          : {
              documentType: 'D',
              documentNumber: values.identifier,
              password: values.password,
            }
      const result = await login(body)
      if ('accessToken' in result) {
        setSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          user: result.user,
        })
        ensureAutoRefresh()
        toast.success(`Welcome, ${result.user.firstName}!`)
        navigate(from, { replace: true })
      } else if (result.requiresMfa) {
        setMfa({
          phase: 'challenge',
          mfaToken: result.mfaToken ?? '',
          challengeId: result.challengeId,
          channel: result.channel,
          maskedDestination: result.maskedDestination,
          activeChannels: result.activeChannels ?? [],
        })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not sign in')
    } finally {
      setLoading(false)
    }
  }

  const onSwitchChannel = async (newChannel: string) => {
    if (mfa.phase !== 'challenge') return
    setSwitchingChannel(true)
    try {
      const result = await switchMfaChannel({ mfaToken: mfa.mfaToken, channel: newChannel })
      setMfa({
        ...mfa,
        channel: newChannel,
        challengeId: result.challengeId,
        maskedDestination: result.maskedDestination,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not switch channel')
    } finally {
      setSwitchingChannel(false)
    }
  }

  const onVerifyMfa = async (values: z.infer<typeof mfaSchema>) => {
    if (mfa.phase !== 'challenge') return
    setLoading(true)
    try {
      const result = await verifyMfa({
        mfaToken: mfa.mfaToken,
        challengeId: mfa.challengeId,
        code: values.code,
      })
      setSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
        user: result.user,
      })
      ensureAutoRefresh()
      toast.success(`Welcome, ${result.user.firstName}!`)
      navigate(from, { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-xl">GREIP Company Portal</CardTitle>
          <CardDescription>
            {mfa.phase === 'challenge'
              ? 'Enter the verification code'
              : 'Sign in with your corporate account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mfa.phase === 'challenge' ? (
            <form onSubmit={mfaForm.handleSubmit(onVerifyMfa)} className="space-y-4">
              {mfa.maskedDestination && (
                <p className="rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
                  We sent a code to <span className="font-medium">{mfa.maskedDestination}</span>
                </p>
              )}
              {mfa.channel === 'TOTP' && mfa.activeChannels && mfa.activeChannels.length > 1 && (
                <p className="rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
                  Using authenticator app. You can also{' '}
                  {mfa.activeChannels.filter((c) => c !== 'TOTP').map((c, i) => (
                    <span key={c}>
                      {i > 0 && ' or '}
                      <button
                        type="button"
                        className="font-medium text-primary underline hover:no-underline"
                        onClick={() => onSwitchChannel(c)}
                        disabled={switchingChannel}
                      >
                        receive a code by {c.toLowerCase()}
                      </button>
                    </span>
                  ))}
                </p>
              )}
              {mfa.channel !== 'TOTP' && mfa.activeChannels && mfa.activeChannels.includes('TOTP') && (
                <p className="text-center">
                  <button
                    type="button"
                    className="text-xs text-primary underline hover:no-underline"
                    onClick={() => onSwitchChannel('TOTP')}
                    disabled={switchingChannel}
                  >
                    Use authenticator app instead
                  </button>
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="000000"
                  autoFocus
                  {...mfaForm.register('code')}
                />
                {mfaForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {mfaForm.formState.errors.code.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Verify
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMfa({ phase: 'none' })}
              >
                Back to login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={identifierType === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setValue('identifierType', 'email')}
                >
                  Email
                </Button>
                <Button
                  type="button"
                  variant={identifierType === 'document' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setValue('identifierType', 'document')}
                >
                  Document (DNI)
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {identifierType === 'email' ? 'Company email' : 'Document number'}
                </Label>
                <Input
                  id="identifier"
                  placeholder={
                    identifierType === 'email' ? 'usuario@greip.com.pe' : '00000000'
                  }
                  autoComplete="username"
                  {...register('identifier')}
                />
                {errors.identifier && (
                  <p className="text-sm text-destructive">{errors.identifier.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/recuperar" className="text-xs text-primary hover:underline">
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} GREIP Company · Corporate use
        </CardFooter>
      </Card>
    </div>
  )
}
