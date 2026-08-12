import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { requestRecovery, resetPassword } from '@/api/security'

const recoverySchema = z.object({
  email: z.string().email('Enter a valid email'),
  channel: z.enum(['EMAIL', 'SMS']),
})

const resetSchema = z
  .object({
    email: z.string().email('Enter a valid email'),
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code received'),
    newPassword: z.string().min(8, 'The password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [loading, setLoading] = useState(false)

  const reqForm = useForm<z.infer<typeof recoverySchema>>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { channel: 'EMAIL' },
  })
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
  })

  const onRequest = async (values: z.infer<typeof recoverySchema>) => {
    setLoading(true)
    try {
      await requestRecovery(values.email, values.channel)
      toast.success('If the account exists, you will receive a 6-digit code')
      setStep('reset')
      resetForm.setValue('email', values.email)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to request recovery')
    } finally {
      setLoading(false)
    }
  }

  const onReset = async (values: z.infer<typeof resetSchema>) => {
    setLoading(true)
    try {
      await resetPassword({
        email: values.email,
        code: values.code,
        newPassword: values.newPassword,
      })
      toast.success('Password updated. You can now sign in.')
      setStep('request')
      resetForm.reset()
      reqForm.reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reset the password')
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
          <CardTitle className="text-xl">
            {step === 'request' ? 'Recover password' : 'Reset password'}
          </CardTitle>
          <CardDescription>
            {step === 'request'
              ? 'Enter your email and we will send you an 8-digit code'
              : 'Enter the code and set your new password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' ? (
            <form onSubmit={reqForm.handleSubmit(onRequest)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Company email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@greip.com.pe"
                  {...reqForm.register('email')}
                />
                {reqForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {reqForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Send the code by</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={reqForm.watch('channel') === 'EMAIL' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => reqForm.setValue('channel', 'EMAIL')}
                  >
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={reqForm.watch('channel') === 'SMS' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => reqForm.setValue('channel', 'SMS')}
                  >
                    SMS
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Request code
              </Button>
            </form>
          ) : (
            <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Company email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@greip.com.pe"
                  disabled
                  {...resetForm.register('email')}
                />
                {resetForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Recovery code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  {...resetForm.register('code')}
                />
                {resetForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.code.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...resetForm.register('newPassword')}
                />
                {resetForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...resetForm.register('confirmPassword')}
                />
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Reset password
              </Button>
            </form>
          )}
          <div className="mt-4 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
