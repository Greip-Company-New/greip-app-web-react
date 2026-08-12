import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Mail, MessageSquareText, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  getProviderConfig,
  sendAwsEmail,
  sendAwsSms,
  sendBrevoEmail,
  sendBrevoSms,
  sendTwilioEmail,
  sendTwilioSms,
  updateProviderConfig,
} from '@/api/thyrd'
import type { NotificationProvider, SesSettings, SnsSettings } from '@/lib/types'

const brevoSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  fromEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  fromName: z.string().optional(),
  smsSender: z.string().optional(),
})

const twilioSchema = z.object({
  enabled: z.boolean(),
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  fromPhone: z.string().optional(),
  fromEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  fromName: z.string().optional(),
})

const sesSchema = z.object({
  enabled: z.boolean(),
  fromEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  fromName: z.string().optional(),
  region: z.string().optional(),
})

const snsSchema = z.object({
  enabled: z.boolean(),
  senderId: z.string().max(11, 'Máximo 11 caracteres').optional(),
  fromPhone: z.string().optional(),
  region: z.string().optional(),
})

const testEmailSchema = z.object({
  to: z.string().email('Email inválido'),
  subject: z.string().min(1, 'Ingresa el asunto'),
  html: z.string().min(1, 'Ingresa el contenido'),
})

const testSmsSchema = z.object({
  phoneNumber: z.string().min(6, 'Ingresa un número válido'),
  message: z.string().min(1, 'Ingresa el mensaje'),
})

type BrevoForm = z.infer<typeof brevoSchema>
type TwilioForm = z.infer<typeof twilioSchema>
type SesForm = z.infer<typeof sesSchema>
type SnsForm = z.infer<typeof snsSchema>

type ProviderKey = NotificationProvider

export default function NotificationProvidersSection({
  tenantCode,
  tenantName,
}: {
  tenantCode?: string
  tenantName?: string
}) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['provider-config', tenantCode ?? 'me'],
    queryFn: () => getProviderConfig(tenantCode),
  })

  const [emailProvider, setEmailProvider] = useState<ProviderKey>('BREVO')
  const [smsProvider, setSmsProvider] = useState<ProviderKey>('BREVO')

  useEffect(() => {
    if (data) {
      setEmailProvider(data.emailProvider)
      setSmsProvider(data.smsProvider)
    }
  }, [data])

  const initial = data
  const tenantLabel = tenantName || tenantCode || initial?.tenant || ''

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Notification providers</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Brevo, Twilio and AWS (SES/SNS) settings per company. Each company decides which provider
          sends email and SMS ({tenantLabel ? `Tenant: ${tenantLabel}` : '—'}).
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading configuration...
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex-1">
            {error instanceof Error ? error.message : 'Could not load the configuration'}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && data && (
        <div className="space-y-6">
          <ActiveProviderSection
            emailProvider={emailProvider}
            smsProvider={smsProvider}
            onEmailChange={setEmailProvider}
            onSmsChange={setSmsProvider}
          />

          <Tabs defaultValue="brevo" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="brevo">Brevo</TabsTrigger>
              <TabsTrigger value="twilio">Twilio</TabsTrigger>
              <TabsTrigger value="aws">AWS</TabsTrigger>
              <TabsTrigger value="test">
                <Send className="mr-2 size-4" /> Test send
              </TabsTrigger>
            </TabsList>
            <TabsContent value="brevo">
              <BrevoTab
                tenantCode={tenantCode}
                initial={data.brevo}
                providerSelection={{ emailProvider, smsProvider }}
                onSaved={() => refetch()}
              />
            </TabsContent>
            <TabsContent value="twilio">
              <TwilioTab
                tenantCode={tenantCode}
                initial={data.twilio}
                providerSelection={{ emailProvider, smsProvider }}
                onSaved={() => refetch()}
              />
            </TabsContent>
            <TabsContent value="aws">
              <AwsTab
                tenantCode={tenantCode}
                initial={{ ses: data.ses, sns: data.sns }}
                providerSelection={{ emailProvider, smsProvider }}
                onSaved={() => refetch()}
              />
            </TabsContent>
            <TabsContent value="test">
              <TestTab tenantCode={tenantCode} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

function ActiveProviderSection({
  emailProvider,
  smsProvider,
  onEmailChange,
  onSmsChange,
}: {
  emailProvider: ProviderKey
  smsProvider: ProviderKey
  onEmailChange: (v: ProviderKey) => void
  onSmsChange: (v: ProviderKey) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active provider per channel</CardTitle>
        <CardDescription>
          Default is Brevo. Email and SMS can be handled by different providers for this company.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Email provider</Label>
          <Select value={emailProvider} onValueChange={(v) => onEmailChange(v as ProviderKey)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BREVO">Brevo</SelectItem>
              <SelectItem value="TWILIO">Twilio (SendGrid)</SelectItem>
              <SelectItem value="SES">AWS SES</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>SMS provider</Label>
          <Select value={smsProvider} onValueChange={(v) => onSmsChange(v as ProviderKey)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BREVO">Brevo</SelectItem>
              <SelectItem value="TWILIO">Twilio</SelectItem>
              <SelectItem value="SNS">AWS SNS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Remember to save the active provider with either of the tabs below so the change takes
          effect.
        </p>
      </CardContent>
    </Card>
  )
}

function BrevoTab({
  tenantCode,
  initial,
  providerSelection,
  onSaved,
}: {
  tenantCode?: string
  initial: { enabled: boolean; apiKey: string; fromEmail: string; fromName: string; smsSender: string }
  providerSelection: { emailProvider: ProviderKey; smsProvider: ProviderKey }
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const form = useForm<BrevoForm>({
    resolver: zodResolver(brevoSchema),
    defaultValues: {
      enabled: initial.enabled,
      apiKey: initial.apiKey,
      fromEmail: initial.fromEmail,
      fromName: initial.fromName,
      smsSender: initial.smsSender,
    },
  })

  const onSubmit = async (values: BrevoForm) => {
    setLoading(true)
    try {
      await updateProviderConfig(
        {
          emailProvider: providerSelection.emailProvider,
          smsProvider: providerSelection.smsProvider,
          brevo: {
            enabled: values.enabled,
            apiKey: values.apiKey || undefined,
            fromEmail: values.fromEmail,
            fromName: values.fromName,
            smsSender: values.smsSender,
          },
        },
        tenantCode,
      )
      toast.success('Brevo configuration saved')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the configuration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brevo parameters</CardTitle>
        <CardDescription>Email and SMS delivery via Brevo API</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Enable Brevo to send notifications for this company.
              </p>
            </div>
            <Switch
              checked={form.watch('enabled')}
              onCheckedChange={(v) => form.setValue('enabled', Boolean(v))}
            />
          </div>
          <Separator />
          <Field
            label="API key"
            type="password"
            placeholder="xkeysib-..."
            hint="Leave as-is to keep the stored key."
            {...form.register('apiKey')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From email" type="email" placeholder="no-reply@greip.com.pe" {...form.register('fromEmail')} required />
            <Field label="From name" placeholder="GREIP COMPANY" {...form.register('fromName')} />
          </div>
          <Field
            label="SMS sender"
            placeholder="GREIP or phone number"
            hint="Alphanumeric sender or approved phone for transactional SMS."
            {...form.register('smsSender')}
          />
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            <Save className="mr-2 size-4" /> Save Brevo
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function TwilioTab({
  tenantCode,
  initial,
  providerSelection,
  onSaved,
}: {
  tenantCode?: string
  initial: {
    enabled: boolean
    accountSid: string
    authToken: string
    sendgridApiKey: string
    fromPhone: string
    fromEmail: string
    fromName: string
  }
  providerSelection: { emailProvider: ProviderKey; smsProvider: ProviderKey }
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const form = useForm<TwilioForm>({
    resolver: zodResolver(twilioSchema),
    defaultValues: {
      enabled: initial.enabled,
      accountSid: initial.accountSid,
      authToken: initial.authToken,
      sendgridApiKey: initial.sendgridApiKey,
      fromPhone: initial.fromPhone,
      fromEmail: initial.fromEmail,
      fromName: initial.fromName,
    },
  })

  const onSubmit = async (values: TwilioForm) => {
    setLoading(true)
    try {
      await updateProviderConfig(
        {
          emailProvider: providerSelection.emailProvider,
          smsProvider: providerSelection.smsProvider,
          twilio: {
            enabled: values.enabled,
            accountSid: values.accountSid || undefined,
            authToken: values.authToken || undefined,
            sendgridApiKey: values.sendgridApiKey || undefined,
            fromPhone: values.fromPhone,
            fromEmail: values.fromEmail,
            fromName: values.fromName,
          },
        },
        tenantCode,
      )
      toast.success('Twilio configuration saved')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the configuration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Twilio parameters</CardTitle>
        <CardDescription>SMS via Twilio and email via Twilio SendGrid</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Enable Twilio to send notifications for this company.
              </p>
            </div>
            <Switch
              checked={form.watch('enabled')}
              onCheckedChange={(v) => form.setValue('enabled', Boolean(v))}
            />
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Account SID"
              type="password"
              placeholder="AC..."
              hint="Leave as-is to keep the stored value."
              {...form.register('accountSid')}
            />
            <Field
              label="Auth token"
              type="password"
              placeholder="Auth token"
              hint="Leave as-is to keep the stored value."
              {...form.register('authToken')}
            />
          </div>
          <Field
            label="SendGrid API key"
            type="password"
            placeholder="SG...."
            hint="Required to send email via Twilio SendGrid."
            {...form.register('sendgridApiKey')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="SMS from number"
              placeholder="+51999888777"
              hint="Twilio phone number approved to send SMS."
              {...form.register('fromPhone')}
            />
            <Field label="From email" type="email" placeholder="no-reply@greip.com.pe" {...form.register('fromEmail')} />
          </div>
          <Field label="From name" placeholder="GREIP COMPANY" {...form.register('fromName')} />
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            <Save className="mr-2 size-4" /> Save Twilio
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AwsTab({
  tenantCode,
  initial,
  providerSelection,
  onSaved,
}: {
  tenantCode?: string
  initial: { ses: SesSettings; sns: SnsSettings }
  providerSelection: { emailProvider: ProviderKey; smsProvider: ProviderKey }
  onSaved: () => void
}) {
  const [sesLoading, setSesLoading] = useState(false)
  const [snsLoading, setSnsLoading] = useState(false)
  const sesForm = useForm<SesForm>({
    resolver: zodResolver(sesSchema),
    defaultValues: {
      enabled: initial.ses.enabled,
      fromEmail: initial.ses.fromEmail,
      fromName: initial.ses.fromName,
      region: initial.ses.region,
    },
  })
  const snsForm = useForm<SnsForm>({
    resolver: zodResolver(snsSchema),
    defaultValues: {
      enabled: initial.sns.enabled,
      senderId: initial.sns.senderId,
      fromPhone: initial.sns.fromPhone,
      region: initial.sns.region,
    },
  })

  const saveSes = async (values: SesForm) => {
    setSesLoading(true)
    try {
      await updateProviderConfig(
        {
          emailProvider: providerSelection.emailProvider,
          smsProvider: providerSelection.smsProvider,
          ses: {
            enabled: values.enabled,
            fromEmail: values.fromEmail || undefined,
            fromName: values.fromName || undefined,
            region: values.region || undefined,
          },
        },
        tenantCode,
      )
      toast.success('SES configuration saved')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the configuration')
    } finally {
      setSesLoading(false)
    }
  }

  const saveSns = async (values: SnsForm) => {
    setSnsLoading(true)
    try {
      await updateProviderConfig(
        {
          emailProvider: providerSelection.emailProvider,
          smsProvider: providerSelection.smsProvider,
          sns: {
            enabled: values.enabled,
            senderId: values.senderId || undefined,
            fromPhone: values.fromPhone || undefined,
            region: values.region || undefined,
          },
        },
        tenantCode,
      )
      toast.success('SNS configuration saved')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the configuration')
    } finally {
      setSnsLoading(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>SES parameters (email)</CardTitle>
          <CardDescription>Email delivery via AWS SES (IAM, no API keys needed)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sesForm.handleSubmit(saveSes)} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">Enable SES to send email for this company.</p>
              </div>
              <Switch
                checked={sesForm.watch('enabled')}
                onCheckedChange={(v) => sesForm.setValue('enabled', Boolean(v))}
              />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="From email"
                type="email"
                placeholder="no-reply@greip.com.pe"
                hint="Must be a verified identity in SES."
                {...sesForm.register('fromEmail')}
              />
              <Field label="From name" placeholder="GREIP COMPANY" {...sesForm.register('fromName')} />
            </div>
            <Field
              label="Region (optional)"
              placeholder="us-east-2"
              hint="Leave empty to use the service region."
              {...sesForm.register('region')}
            />
            <Button type="submit" disabled={sesLoading}>
              {sesLoading && <Loader2 className="size-4 animate-spin" />}
              <Save className="mr-2 size-4" /> Save SES
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SNS parameters (SMS)</CardTitle>
          <CardDescription>SMS delivery via AWS SNS (IAM, no API keys needed)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={snsForm.handleSubmit(saveSns)} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">Enable SNS to send SMS for this company.</p>
              </div>
              <Switch
                checked={snsForm.watch('enabled')}
                onCheckedChange={(v) => snsForm.setValue('enabled', Boolean(v))}
              />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Sender ID"
                placeholder="GREIP"
                hint="Alphanumeric sender registered in the destination country (max 11)."
                {...snsForm.register('senderId')}
              />
              <Field
                label="Origination number (optional)"
                placeholder="+51999888777"
                hint="Phone number purchased for SNS in AWS."
                {...snsForm.register('fromPhone')}
              />
            </div>
            <Field
              label="Region (optional)"
              placeholder="us-east-2"
              hint="Leave empty to use the service region."
              {...snsForm.register('region')}
            />
            <Button type="submit" disabled={snsLoading}>
              {snsLoading && <Loader2 className="size-4 animate-spin" />}
              <Save className="mr-2 size-4" /> Save SNS
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function TestTab({ tenantCode }: { tenantCode?: string }) {
  const [emailProvider, setEmailProvider] = useState<ProviderKey>('BREVO')
  const [smsProvider, setSmsProvider] = useState<ProviderKey>('BREVO')
  const [emailLoading, setEmailLoading] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)

  const emailForm = useForm<z.infer<typeof testEmailSchema>>({
    resolver: zodResolver(testEmailSchema),
  })
  const smsForm = useForm<z.infer<typeof testSmsSchema>>({
    resolver: zodResolver(testSmsSchema),
  })

  const sendTestEmail = async (values: z.infer<typeof testEmailSchema>) => {
    setEmailLoading(true)
    try {
      const fn =
        emailProvider === 'BREVO'
          ? sendBrevoEmail
          : emailProvider === 'TWILIO'
            ? sendTwilioEmail
            : sendAwsEmail
      await fn(
        {
          to: values.to.split(',').map((s) => s.trim()).filter(Boolean),
          subject: values.subject,
          html: values.html,
        },
        tenantCode,
      )
      toast.success(`Test email sent via ${emailProvider}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the test email')
    } finally {
      setEmailLoading(false)
    }
  }

  const sendTestSms = async (values: z.infer<typeof testSmsSchema>) => {
    setSmsLoading(true)
    try {
      const fn = smsProvider === 'BREVO' ? sendBrevoSms : smsProvider === 'TWILIO' ? sendTwilioSms : sendAwsSms
      await fn({ phoneNumber: values.phoneNumber, message: values.message }, tenantCode)
      toast.success(`Test SMS sent via ${smsProvider}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the test SMS')
    } finally {
      setSmsLoading(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Send test email</CardTitle>
          <CardDescription>Verify the configured provider delivers email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={emailForm.handleSubmit(sendTestEmail)} className="space-y-4">
            <div className="space-y-2">
              <Label>Provider *</Label>
              <Select value={emailProvider} onValueChange={(v) => setEmailProvider(v as ProviderKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BREVO">Brevo</SelectItem>
                  <SelectItem value="TWILIO">Twilio (SendGrid)</SelectItem>
                  <SelectItem value="SES">AWS SES</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TestField
              label="Recipients *"
              placeholder="a@greip.com.pe, b@greip.com.pe"
              register={emailForm.register('to')}
              error={emailForm.formState.errors.to?.message}
            />
            <TestField
              label="Subject *"
              register={emailForm.register('subject')}
              error={emailForm.formState.errors.subject?.message}
            />
            <TestField
              label="Content *"
              textarea
              rows={5}
              placeholder="<h1>Hola, esta es una prueba</h1>"
              register={emailForm.register('html')}
              error={emailForm.formState.errors.html?.message}
            />
            <Button type="submit" disabled={emailLoading}>
              {emailLoading && <Loader2 className="size-4 animate-spin" />}
              <Mail className="mr-2 size-4" /> Send test email
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send test SMS</CardTitle>
          <CardDescription>Verify the configured provider delivers SMS.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={smsForm.handleSubmit(sendTestSms)} className="space-y-4">
            <div className="space-y-2">
              <Label>Provider *</Label>
              <Select value={smsProvider} onValueChange={(v) => setSmsProvider(v as ProviderKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BREVO">Brevo</SelectItem>
                  <SelectItem value="TWILIO">Twilio</SelectItem>
                  <SelectItem value="SNS">AWS SNS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TestField
              label="Phone *"
              placeholder="+51999888777"
              register={smsForm.register('phoneNumber')}
              error={smsForm.formState.errors.phoneNumber?.message}
            />
            <TestField
              label="Message *"
              textarea
              rows={4}
              register={smsForm.register('message')}
              error={smsForm.formState.errors.message?.message}
            />
            <Button type="submit" disabled={smsLoading}>
              {smsLoading && <Loader2 className="size-4 animate-spin" />}
              <MessageSquareText className="mr-2 size-4" /> Send test SMS
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function TestField({
  label,
  textarea,
  rows,
  placeholder,
  register,
  error,
}: {
  label: string
  textarea?: boolean
  rows?: number
  placeholder?: string
  register: UseFormRegisterReturn
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {textarea ? (
        <textarea
          rows={rows}
          placeholder={placeholder}
          className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...register}
        />
      ) : (
        <Input placeholder={placeholder} {...register} />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}