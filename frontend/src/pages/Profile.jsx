import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Camera, Save, Loader2, Star, BookOpen, Users, Award, Edit3,
  Check, ExternalLink, Shield, Mail, Phone, Smartphone, QrCode,
  AlertTriangle, Eye, EyeOff,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'
import { usersApi, progressApi, certificatesApi } from '@/api/users'
import { authApi } from '@/api/auth'
import { getInitials, formatDate, cn } from '@/lib/utils'

const ROLE_STYLES = {
  student: 'bg-blue-100 text-blue-700',
  tutor:   'bg-indigo-100 text-indigo-700',
  teacher: 'bg-violet-100 text-violet-700',
  admin:   'bg-red-100 text-red-700',
}

// ── 2FA setup section ─────────────────────────────────────────────────────────
function TwoFASection({ user, onUserUpdate }) {
  const [step, setStep] = useState('idle') // idle | loading | qr | confirm | disable
  const [qrData, setQrData] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const startSetup = async () => {
    setStep('loading')
    setError('')
    try {
      const { data } = await authApi.get2faSetup()
      setQrData(data)
      setStep('qr')
    } catch {
      setStep('idle')
      toast({ title: 'Failed to start 2FA setup', variant: 'destructive' })
    }
  }

  const confirmSetup = async () => {
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      await authApi.confirm2fa(code)
      onUserUpdate({ two_fa_enabled: true })
      setStep('idle')
      setCode('')
      setQrData(null)
      toast({ title: '2FA enabled!', description: 'Your account is now more secure.', variant: 'success' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code.')
    } finally {
      setLoading(false)
    }
  }

  const disable2fa = async () => {
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      await authApi.disable2fa(code)
      onUserUpdate({ two_fa_enabled: false })
      setStep('idle')
      setCode('')
      toast({ title: '2FA disabled', variant: 'success' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code.')
    } finally {
      setLoading(false)
    }
  }

  if (user?.two_fa_enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Shield className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-emerald-800 text-sm">2FA is Active</div>
            <div className="text-xs text-emerald-600">Your account is protected with an authenticator app.</div>
          </div>
          <Badge className="bg-emerald-500 text-white border-0">Active</Badge>
        </div>

        {step === 'disable' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter your current 6-digit authenticator code to disable 2FA:</p>
            <Input
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-xl font-bold tracking-widest h-12 max-w-xs"
              maxLength={6}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="destructive" onClick={disable2fa} disabled={loading || code.length < 6} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Confirm Disable
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setStep('idle'); setCode(''); setError('') }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-red-50"
            onClick={() => setStep('disable')}>
            <AlertTriangle className="h-4 w-4 mr-2" />Disable 2FA
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <Shield className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-amber-800 text-sm">2FA is Not Enabled</div>
          <div className="text-xs text-amber-600">Enable 2FA to protect your account with an authenticator app.</div>
        </div>
      </div>

      {step === 'idle' && (
        <Button size="sm" onClick={startSetup}>
          <Smartphone className="h-4 w-4 mr-2" />Set Up Authenticator App
        </Button>
      )}

      {step === 'loading' && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Generating QR code…</p>}

      {step === 'qr' && qrData && (
        <div className="space-y-4">
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
            <li>Scan the QR code below with the app</li>
            <li>Enter the 6-digit code shown in the app</li>
          </ol>
          <div className="flex justify-center">
            <img src={qrData.qr_code} alt="2FA QR Code" className="w-48 h-48 rounded-xl border p-2 bg-white" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Can't scan? Enter this key manually:{' '}
            <span className="font-mono font-bold text-slate-700">{qrData.secret}</span>
          </p>
          <div>
            <Label>Verification Code</Label>
            <Input
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-xl font-bold tracking-widest h-12 max-w-xs mt-1.5"
              maxLength={6}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button onClick={confirmSetup} disabled={loading || code.length < 6} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}Activate 2FA
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setStep('idle'); setCode(''); setQrData(null); setError('') }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Phone verification section ────────────────────────────────────────────────
function PhoneSection({ user, onUserUpdate }) {
  const [phone, setPhone] = useState(user?.phone_number || '')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendOTP = async () => {
    if (!phone.trim()) return toast({ title: 'Enter a phone number first', variant: 'destructive' })
    setLoading(true)
    setError('')
    try {
      await authApi.sendPhoneOTP(phone)
      setOtpSent(true)
      setCooldown(60)
      const interval = setInterval(() => setCooldown((c) => { if (c <= 1) clearInterval(interval); return c - 1 }), 1000)
      toast({ title: 'Code sent!', description: `Check SMS at ${phone}`, variant: 'success' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send code.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    if (otp.length < 6) return
    setLoading(true)
    setError('')
    try {
      await authApi.verifyPhone(otp)
      onUserUpdate({ phone_number: phone, phone_verified: true })
      setOtpSent(false)
      setOtp('')
      toast({ title: 'Phone verified!', variant: 'success' })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label>Phone Number</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+374 XX XXX XXX"
            className="mt-1.5"
            disabled={user?.phone_verified}
          />
        </div>
        {user?.phone_verified
          ? <Badge className="bg-emerald-500 text-white border-0 mt-6">✓ Verified</Badge>
          : <Button size="sm" className="mt-6 shrink-0" onClick={sendOTP} disabled={loading || cooldown > 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-1.5" />}
              {cooldown > 0 ? `${cooldown}s` : 'Send Code'}
            </Button>
        }
      </div>

      {otpSent && !user?.phone_verified && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to your phone:</p>
          <Input
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-xl font-bold tracking-widest h-12 max-w-xs"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button size="sm" onClick={verifyOTP} disabled={loading || otp.length < 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}Verify
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing]       = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarInputRef = useRef(null)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.profile().then((r) => r.data),
  })
  const { data: progressData } = useQuery({
    queryKey: ['progress'],
    queryFn: () => progressApi.list().then((r) => r.data),
  })
  const { data: certsData } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesApi.list().then((r) => r.data),
  })

  const display = profile || user
  const progress = progressData?.results || progressData || []
  const certs = certsData?.results || certsData || []
  const isTutor = ['tutor', 'teacher'].includes(display?.role)
  const fullName = display?.first_name ? `${display.first_name} ${display.last_name}`.trim() : display?.username

  const [form, setForm] = useState({
    first_name: display?.first_name || '',
    last_name: display?.last_name || '',
    bio: display?.bio || '',
    expertise_areas: display?.expertise_areas || '',
    hourly_rate:     display?.hourly_rate     || '',
    paypal_me_link:  display?.paypal_me_link  || '',
  })

  const updateMutation = useMutation({
    mutationFn: (data) => usersApi.updateProfile(data),
    onSuccess: ({ data }) => {
      updateUser(data)
      queryClient.invalidateQueries(['profile'])
      setEditing(false)
      toast({ title: 'Profile updated!', variant: 'success' })
    },
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  })

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleUserUpdate = (updates) => {
    updateUser(updates)
    queryClient.invalidateQueries(['profile'])
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    try {
      const fd = new FormData()
      fd.append('profile_picture', file)
      const { data } = await usersApi.uploadAvatar(fd)
      updateUser(data)
      queryClient.invalidateQueries(['profile'])
      toast({ title: 'Profile picture updated!', variant: 'success' })
    } catch {
      toast({ title: 'Failed to upload image', variant: 'destructive' })
    } finally {
      setAvatarLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Profile header */}
        <div className="card-base overflow-hidden">
          <div className="h-28 gradient-brand relative">
            <div className="absolute inset-0 pattern-dots opacity-40" />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-5 flex-wrap gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                  <AvatarImage src={display?.profile_picture} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md border-2 border-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  title="Change profile picture"
                >
                  {avatarLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              {!editing
                ? <Button variant="outline" onClick={() => setEditing(true)}><Edit3 className="h-4 w-4 mr-2" />Edit Profile</Button>
                : <div className="flex gap-2">
                    <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
              }
            </div>

            <div className="flex items-start gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold">{fullName}</h2>
                  {display?.email_verified && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
                      <Check className="h-3 w-3" />Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-sm text-muted-foreground">@{display?.username}</span>
                  <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize', ROLE_STYLES[display?.role] || 'bg-slate-100 text-slate-700')}>
                    {display?.role}
                  </span>
                </div>
              </div>
            </div>

            {display?.bio && !editing && <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">{display.bio}</p>}

            {isTutor && !editing && (
              <div className="flex flex-wrap gap-6 mt-5 text-sm text-muted-foreground pt-4 border-t">
                <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-slate-800">{Number(display?.average_rating || 0).toFixed(1)}</span> avg rating</div>
                <div className="flex items-center gap-1.5"><Users className="h-4 w-4" />
                  <span className="font-semibold text-slate-800">{display?.total_students || 0}</span> students</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            {!isTutor && <TabsTrigger value="learning">My Learning</TabsTrigger>}
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Account details */}
          <TabsContent value="details">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>First name</Label>
                    <Input name="first_name" value={form.first_name} onChange={handleChange} disabled={!editing} className="mt-1.5" /></div>
                  <div><Label>Last name</Label>
                    <Input name="last_name" value={form.last_name} onChange={handleChange} disabled={!editing} className="mt-1.5" /></div>
                </div>
                <div><Label>Bio</Label>
                  <Textarea name="bio" value={form.bio} onChange={handleChange} disabled={!editing} rows={3} placeholder="Tell students about yourself…" className="mt-1.5" /></div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-1.5 text-muted-foreground">
                  <div className="font-medium text-slate-700 mb-2">Account Info</div>
                  {[['Email', display?.email], ['Username', `@${display?.username}`], ['Member since', formatDate(display?.created_at)]].map(([l, v]) => (
                    <div key={l} className="flex gap-2"><span className="w-28 shrink-0">{l}</span><span className="font-medium text-slate-700">{v}</span></div>
                  ))}
                </div>
                {isTutor && <>
                  <Separator />
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tutor Settings</div>
                  <div><Label>Expertise areas</Label>
                    <Input name="expertise_areas" value={form.expertise_areas} onChange={handleChange} disabled={!editing} placeholder="Mathematics, Physics, Computer Science" className="mt-1.5" /></div>
                  <div><Label>Hourly rate (AMD)</Label>
                    <Input name="hourly_rate" type="number" value={form.hourly_rate} onChange={handleChange} disabled={!editing} placeholder="5000" className="mt-1.5" /></div>
                  <div>
                    <Label>PayPal.me link <span className="text-xs text-muted-foreground font-normal">(used for paid course payments — no business registration needed)</span></Label>
                    <Input name="paypal_me_link" type="url" value={form.paypal_me_link} onChange={handleChange} disabled={!editing}
                      placeholder="https://paypal.me/yourname" className="mt-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Students are sent directly to your PayPal to complete payment. Set up a free account at <a href="https://paypal.me" target="_blank" rel="noreferrer" className="text-primary underline">paypal.me</a>
                    </p>
                  </div>
                </>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning */}
          <TabsContent value="learning">
            {progress.length === 0
              ? <div className="card-base p-10 text-center border-dashed">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-1">No courses yet</p>
                  <Button asChild size="sm"><a href="/courses">Browse Courses</a></Button>
                </div>
              : <div className="space-y-3">
                  {progress.map((p) => (
                    <Card key={p.id}><CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1.5 truncate">{p.course_title}</div>
                        <div className="flex items-center gap-3">
                          <Progress value={p.completion_percentage || 0} className="flex-1 h-2" />
                          <span className="text-xs font-semibold text-primary shrink-0">{Math.round(p.completion_percentage || 0)}%</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild className="shrink-0">
                        <a href={`/courses/${p.course}`}>View</a>
                      </Button>
                    </CardContent></Card>
                  ))}
                </div>
            }
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates">
            {certs.length === 0
              ? <div className="card-base p-10 text-center border-dashed">
                  <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-1">No certificates yet</p>
                  <p className="text-sm text-muted-foreground">Complete a course to earn your first certificate!</p>
                </div>
              : <div className="grid sm:grid-cols-2 gap-4">
                  {certs.map((cert) => (
                    <div key={cert.id} className="card-base p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl shrink-0">🏅</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm mb-0.5 truncate">{cert.course_title}</div>
                          <div className="text-xs text-amber-700 font-medium">Completed {formatDate(cert.issue_date)}</div>
                          <div className="text-xs font-mono text-amber-600 mt-1 truncate">#{cert.certificate_number}</div>
                          <button className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                            <ExternalLink className="h-3 w-3" />View certificate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <div className="space-y-5">
              {/* Email status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />Email Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {display?.email_verified
                    ? <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <Check className="h-4 w-4" />
                        <span><strong>{display.email}</strong> is verified</span>
                      </div>
                    : <div className="flex items-center gap-2 text-sm text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Email not verified. <a href={`/verify-email?email=${display?.email}`} className="underline font-semibold">Verify now →</a></span>
                      </div>
                  }
                </CardContent>
              </Card>

              {/* Phone */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />Phone Number
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PhoneSection user={display} onUserUpdate={handleUserUpdate} />
                </CardContent>
              </Card>

              {/* 2FA */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />Two-Factor Authentication (2FA)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {display?.email_verified
                    ? <TwoFASection user={display} onUserUpdate={handleUserUpdate} />
                    : <p className="text-sm text-muted-foreground">Please verify your email address before enabling 2FA.</p>
                  }
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
