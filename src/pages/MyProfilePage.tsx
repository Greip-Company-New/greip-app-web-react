import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, ShieldCheck, ShieldOff, KeyRound } from 'lucide-react'
import { toDataURL } from 'qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, PageHeader, formatDate } from '@/components/common'
import ChangeLogTable from '@/components/ChangeLogTable'
import { useAuditByUser, useGetUserDetail, useUpdateUser, useRegisterTotp, useVerifyTotp, useEnableEmailMfa, useVerifyEmailMfa, useDisableMfa } from '@/hooks/queries'
import { useAuthStore } from '@/stores/auth'
import { changePassword } from '@/api/security'
import { toast } from 'sonner'

const editSchema = z.object({
  firstName: z.string().min(2, 'Enter the first name'),
  fatherLastName: z.string().min(2, 'Enter the father last name'),
  motherLastName: z.string().optional(),
  phone: z.string().optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter current password'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type EditValues = z.infer<typeof editSchema>

export default function MyProfilePage() {
  const sessionUser = useAuthStore((s) => s.user)
  const userId = sessionUser?.userId ?? null

  const { data, isLoading, isError, error } = useGetUserDetail(userId)
  const updateUser = useUpdateUser()
  const registerTotp = useRegisterTotp()
  const verifyTotp = useVerifyTotp()
  const enableEmailMfa = useEnableEmailMfa()
  const verifyEmailMfa = useVerifyEmailMfa()
  const disableMfa = useDisableMfa()

  const [totpData, setTotpData] = useState<{ secret: string; otpauthUrl: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpQrDataUrl, setTotpQrDataUrl] = useState<string | null>(null)
  const [emailMfaChallengeId, setEmailMfaChallengeId] = useState<string | null>(null)
  const [emailMfaCode, setEmailMfaCode] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) })

  const {
    data: logsData,
    isLoading: logsLoading,
    isError: logsError,
    error: logsErrorInfo,
  } = useAuditByUser(
    userId
      ? {
          userId,
          tenantId: String(sessionUser?.tenantId ?? 1),
        }
      : undefined,
  )

  const user = data?.user
  const roles = data?.roles ?? []
  const permissions = data?.permissions ?? []

  const form = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName ?? '',
        fatherLastName: user.fatherLastName ?? '',
        motherLastName: user.motherLastName ?? '',
        phone: user.phone ?? '',
      })
    }
  }, [user, form])

  const onSubmit = async (values: EditValues) => {
    if (!userId) return
    await updateUser.mutateAsync({ userId, body: values })
  }

  const onPasswordChange = async (values: z.infer<typeof passwordSchema>) => {
    setChangingPassword(true)
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      toast.success('Password updated')
      passwordForm.reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const onRegisterTotp = async () => {
    if (!userId) return
    const data = await registerTotp.mutateAsync(userId)
    setTotpData(data)
    setTotpCode('')
    const qr = await toDataURL(data.otpauthUrl, { width: 160, margin: 1 })
    setTotpQrDataUrl(qr)
  }

  const onVerifyTotp = async () => {
    if (!userId || !totpCode) return
    await verifyTotp.mutateAsync({ userId, code: totpCode })
    setTotpData(null)
    setTotpCode('')
    setTotpQrDataUrl(null)
  }

  const onEnableEmailMfa = async () => {
    if (!userId) return
    const data = await enableEmailMfa.mutateAsync(userId)
    setEmailMfaChallengeId(data.challengeId)
    setEmailMfaCode('')
  }

  const onVerifyEmailMfa = async () => {
    if (!userId || !emailMfaChallengeId || !emailMfaCode) return
    await verifyEmailMfa.mutateAsync({ userId, challengeId: emailMfaChallengeId, code: emailMfaCode })
    setEmailMfaChallengeId(null)
    setEmailMfaCode('')
  }

  const onDisableMfa = async (channel: string) => {
    if (!userId) return
    if (!confirm(`Disable ${channel.toUpperCase()} MFA? You will lose this protection.`)) return
    await disableMfa.mutateAsync({ userId, channel })
  }

  const mfa = user?.mfa || {}
  const totpActive = mfa.totp?.active
  const emailActive = mfa.email?.active

  return (
    <>
      <PageHeader title="User settings" description="Your session's data, roles, permissions and activity" />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ProfileField label="Full name" value={`${user?.firstName ?? '—'} ${user?.fatherLastName ?? ''}`} />
            <ProfileField label="Email" value={user?.email ?? '—'} />
            <ProfileField label="Document" value={user ? `${user.documentType}-${user.documentNumber}` : '—'} />
            <ProfileField label="Phone" value={user?.phone ?? '—'} />
            <ProfileField label="Tenant" value={String(user?.tenantId ?? '—')} />
            <ProfileField label="Account created" value={formatDate(user?.createdAt)} />
          </CardContent>
        </Card>

        <Tabs defaultValue="perfil">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="perfil">Edit profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="roles">Roles and permissions</TabsTrigger>
            <TabsTrigger value="actividad">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Editable data</CardTitle>
                <CardDescription>Only update the allowed attributes.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : isError ? (
                  <EmptyState message={error instanceof Error ? error.message : 'Failed to load your profile'} />
                ) : (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>First name *</Label>
                        <Input {...form.register('firstName')} />
                        {form.formState.errors.firstName && (
                          <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Father last name *</Label>
                        <Input {...form.register('fatherLastName')} />
                        {form.formState.errors.fatherLastName && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.fatherLastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Mother last name</Label>
                        <Input {...form.register('motherLastName')} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input {...form.register('phone')} />
                      </div>
                    </div>
                    <Button type="submit" disabled={updateUser.isPending}>
                      {updateUser.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Save changes
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Multi-factor authentication</CardTitle>
                <CardDescription>Protect your account with additional verification steps.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email verification status */}
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <p className="font-medium">Email verified</p>
                    <p className="text-xs text-muted-foreground">Required to activate email MFA.</p>
                  </div>
                  <div title={user?.emailVerified ? "Email is verified" : "Email not verified"}>
                    {user?.emailVerified ? (
                      <ShieldCheck className="size-5 text-green-600" />
                    ) : (
                      <ShieldOff className="size-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* TOTP */}
                <div className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Authenticator app (TOTP)</p>
                      <p className="text-xs text-muted-foreground">
                        {totpActive ? 'TOTP is active' : 'Use an app like Google Authenticator or Authy'}
                      </p>
                    </div>
                    {totpActive ? (
                      <Button variant="outline" size="sm" onClick={() => onDisableMfa('totp')} disabled={disableMfa.isPending}>
                        Disable
                      </Button>
                    ) : totpData ? (
                      <Button variant="ghost" size="sm" onClick={() => { setTotpData(null); setTotpCode(''); setTotpQrDataUrl(null); }}>Cancel</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={onRegisterTotp} disabled={registerTotp.isPending}>
                        {registerTotp.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Enable'}
                      </Button>
                    )}
                  </div>
                  {totpData && !totpActive && (
                    <div className="space-y-4 pt-2 border-t">
                      <div className="flex flex-col items-center gap-3">
                        {totpQrDataUrl && (
                          <img src={totpQrDataUrl} alt="TOTP QR Code" className="rounded-md border p-2 bg-white w-40 h-40" />
                        )}
                        <p className="text-xs text-muted-foreground font-mono break-all text-center">{totpData.secret}</p>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Scan the QR code or enter the secret manually in your authenticator app, then enter the 6-digit code below.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          maxLength={6}
                          placeholder="000000"
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                          className="font-mono text-center"
                        />
                        <Button onClick={onVerifyTotp} disabled={totpCode.length !== 6 || verifyTotp.isPending}>
                          {verifyTotp.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Verify'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email MFA */}
                <div className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email verification code</p>
                      <p className="text-xs text-muted-foreground">
                        {emailActive ? 'Email MFA is active' : 'Receive a code by email on each login'}
                      </p>
                    </div>
                    {emailActive ? (
                      <Button variant="outline" size="sm" onClick={() => onDisableMfa('email')} disabled={disableMfa.isPending}>
                        Disable
                      </Button>
                    ) : emailMfaChallengeId ? (
                      <Button variant="ghost" size="sm" onClick={() => { setEmailMfaChallengeId(null); setEmailMfaCode(''); }}>Cancel</Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onEnableEmailMfa}
                        disabled={!user?.emailVerified || enableEmailMfa.isPending}
                        title={!user?.emailVerified ? 'Verify your email first' : undefined}
                      >
                        {enableEmailMfa.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Enable'}
                      </Button>
                    )}
                  </div>
                  {emailMfaChallengeId && !emailActive && (
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        A verification code was sent to your email. Enter it below:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          maxLength={6}
                          placeholder="000000"
                          value={emailMfaCode}
                          onChange={(e) => setEmailMfaCode(e.target.value.replace(/\D/g, ''))}
                          className="font-mono text-center"
                        />
                        <Button onClick={onVerifyEmailMfa} disabled={emailMfaCode.length !== 6 || verifyEmailMfa.isPending}>
                          {verifyEmailMfa.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Verify'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SMS — disabled for now */}
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-muted-foreground">SMS verification</p>
                      <p className="text-xs text-muted-foreground">Not available yet</p>
                    </div>
                    <Button variant="outline" size="sm" disabled>Coming soon</Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="font-medium">Change password</p>
                    <p className="text-xs text-muted-foreground">Update your account password.</p>
                  </div>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordChange)} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Current password</Label>
                      <Input type="password" {...passwordForm.register('currentPassword')} />
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>New password</Label>
                        <Input type="password" {...passwordForm.register('newPassword')} />
                        {passwordForm.formState.errors.newPassword && (
                          <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm password</Label>
                        <Input type="password" {...passwordForm.register('confirmPassword')} />
                        {passwordForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                    </div>
                    <Button type="submit" disabled={changingPassword}>
                      {changingPassword && <Loader2 className="size-4 animate-spin" />}
                      <KeyRound className="size-4" />
                      Change password
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assigned roles and permissions</CardTitle>
                <CardDescription>What you can do in the portal based on your role.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Roles
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-40" />
                  ) : roles.length === 0 ? (
                    <EmptyState message="You have no assigned roles" />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {roles.map((r) => (
                        <Badge key={r.id} variant="secondary">
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Permissions
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-40" />
                  ) : permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You have no assigned permissions</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {permissions.map((p) => (
                        <Badge key={p} variant="outline" className="font-mono">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actividad">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Movements and events</CardTitle>
                <CardDescription>All events registered about your user.</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : logsError ? (
                  <EmptyState
                    message={
                      logsErrorInfo instanceof Error ? logsErrorInfo.message : 'Failed to load activity'
                    }
                  />
                ) : (
                  <ChangeLogTable logs={logsData?.data ?? []} showUser showChannel />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  )
}