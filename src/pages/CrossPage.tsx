import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Lock, Mail, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { decryptTokenData, encryptTokenData, sendEmail, sendSms } from '@/api/cross'

const emailSchema = z.object({
  to: z.string().min(3, 'Enter at least one recipient'),
  subject: z.string().min(1, 'Enter the subject'),
  text: z.string().min(1, 'Enter the content'),
  from: z.string().optional(),
})

const smsSchema = z.object({
  phoneNumber: z.string().min(6, 'Enter a valid number'),
  message: z.string().min(1, 'Enter the message'),
})

const cryptoSchema = z.object({
  input: z.string().min(1, 'Enter the data'),
})

export default function CrossPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications and crypto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-cutting service: email, SMS and data encryption
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email">
            <Mail className="mr-2 size-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquareText className="mr-2 size-4" /> SMS
          </TabsTrigger>
          <TabsTrigger value="crypto">
            <Lock className="mr-2 size-4" /> Encryption
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email">
          <EmailTab />
        </TabsContent>
        <TabsContent value="sms">
          <SmsTab />
        </TabsContent>
        <TabsContent value="crypto">
          <CryptoTab />
        </TabsContent>
      </Tabs>
    </>
  )
}

function EmailTab() {
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) })

  const onSubmit = async (values: z.infer<typeof emailSchema>) => {
    setLoading(true)
    try {
      await sendEmail({
        to: values.to.split(',').map((s) => s.trim()).filter(Boolean),
        subject: values.subject,
        text: values.text,
        from: values.from || undefined,
      })
      toast.success('Email sent successfully')
      form.reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send email</CardTitle>
        <CardDescription>Send an email to one or more recipients</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Recipients *</Label>
            <Input placeholder="a@greip.com.pe, b@greip.com.pe" {...form.register('to')} />
            {form.formState.errors.to && (
              <p className="text-sm text-destructive">{form.formState.errors.to.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input {...form.register('subject')} />
          </div>
          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea rows={5} {...form.register('text')} />
          </div>
          <div className="space-y-2">
            <Label>Sender (optional)</Label>
            <Input placeholder="no-reply@greip.com.pe" {...form.register('from')} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Send email
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function SmsTab() {
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof smsSchema>>({ resolver: zodResolver(smsSchema) })

  const onSubmit = async (values: z.infer<typeof smsSchema>) => {
    setLoading(true)
    try {
      await sendSms({ phoneNumber: values.phoneNumber, message: values.message })
      toast.success('SMS sent successfully')
      form.reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the SMS')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send SMS</CardTitle>
        <CardDescription>Send a text message to a phone number</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input placeholder="+51999000111" {...form.register('phoneNumber')} />
            {form.formState.errors.phoneNumber && (
              <p className="text-sm text-destructive">
                {form.formState.errors.phoneNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea rows={4} {...form.register('message')} />
            {form.formState.errors.message && (
              <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>
            )}
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Send SMS
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CryptoTab() {
  const [encLoading, setEncLoading] = useState(false)
  const [decLoading, setDecLoading] = useState(false)
  const encForm = useForm<z.infer<typeof cryptoSchema>>({ resolver: zodResolver(cryptoSchema) })
  const decForm = useForm<z.infer<typeof cryptoSchema>>({ resolver: zodResolver(cryptoSchema) })
  const [encResult, setEncResult] = useState('')
  const [decResult, setDecResult] = useState('')

  const onEncrypt = async (values: z.infer<typeof cryptoSchema>) => {
    setEncLoading(true)
    try {
      let data: unknown
      try {
        data = JSON.parse(values.input)
      } catch {
        data = values.input
      }
      const res = await encryptTokenData(data)
      setEncResult(res.encrypted ?? JSON.stringify(res))
      toast.success('Data encrypted successfully')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Encryption error')
    } finally {
      setEncLoading(false)
    }
  }

  const onDecrypt = async (values: z.infer<typeof cryptoSchema>) => {
    setDecLoading(true)
    try {
      const res = await decryptTokenData(values.input)
      setDecResult(JSON.stringify(res.data, null, 2))
      toast.success('Data decrypted successfully')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Decryption error')
    } finally {
      setDecLoading(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Encrypt</CardTitle>
          <CardDescription>Encrypt a piece of data (JSON or text)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={encForm.handleSubmit(onEncrypt)} className="space-y-3">
            <Textarea rows={4} placeholder='{"key": "value"}' {...encForm.register('input')} />
            {encForm.formState.errors.input && (
              <p className="text-sm text-destructive">
                {encForm.formState.errors.input.message}
              </p>
            )}
            <Button type="submit" disabled={encLoading}>
              {encLoading && <Loader2 className="size-4 animate-spin" />}
              Encrypt
            </Button>
          </form>
          {encResult && (
            <div className="space-y-2">
              <Label>Result</Label>
              <Textarea readOnly value={encResult} rows={4} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decrypt</CardTitle>
          <CardDescription>Decrypt piece of encrypted data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={decForm.handleSubmit(onDecrypt)} className="space-y-3">
            <Textarea rows={4} placeholder="Encrypted data..." {...decForm.register('input')} />
            {decForm.formState.errors.input && (
              <p className="text-sm text-destructive">
                {decForm.formState.errors.input.message}
              </p>
            )}
            <Button type="submit" disabled={decLoading}>
              {decLoading && <Loader2 className="size-4 animate-spin" />}
              Decrypt
            </Button>
          </form>
          {decResult && (
            <div className="space-y-2">
              <Label>Result</Label>
              <Textarea readOnly value={decResult} rows={4} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
