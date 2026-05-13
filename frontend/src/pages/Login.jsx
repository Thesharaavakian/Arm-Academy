import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, Loader2, ArrowRight, Sparkles, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const HIGHLIGHTS = [
  'Live classes with expert Armenian tutors',
  'Self-paced recorded courses',
  'Verified certificates on completion',
]

// ── OTP digit input ───────────────────────────────────────────────────────────
function OTPInput({ value, onChange, length = 6 }) {
  const digits = value.padEnd(length, '').split('').slice(0, length)

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = digits.slice(); next[i] = ''
      onChange(next.join('').trimEnd())
      if (i > 0) document.getElementById(`otp-${i - 1}`)?.focus()
    }
  }

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = digits.slice(); next[i] = char
    const joined = next.join('').replace(/ /g, '')
    onChange(joined)
    if (char && i < length - 1) document.getElementById(`otp-${i + 1}`)?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    document.getElementById(`otp-${Math.min(pasted.length, length - 1)}`)?.focus()
    e.preventDefault()
  }

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className="h-14 w-12 rounded-xl border-2 bg-slate-50 text-center text-xl font-bold outline-none transition-all focus:border-primary focus:bg-white focus:shadow-sm"
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const from = location.state?.from?.pathname || '/dashboard'

  const [step, setStep] = useState('credentials') // 'credentials' | '2fa'
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tempToken, setTempToken] = useState('')
  const [twoFACode, setTwoFACode] = useState('')

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleCredentials = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(form.email, form.password)

      if (data.requires_verification) {
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
        return
      }

      if (data.requires_2fa) {
        setTempToken(data.temp_token)
        setStep('2fa')
        return
      }

      // Normal login — data includes { access, refresh, user }
      login(data.user, { access: data.access, refresh: data.refresh })
      toast({ title: 'Welcome back!', variant: 'success' })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handle2FA = async (e) => {
    e.preventDefault()
    if (twoFACode.length < 6) return
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.verify2fa(tempToken, twoFACode)
      login(data.user, { access: data.access, refresh: data.refresh })
      toast({ title: 'Logged in!', variant: 'success' })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Please try again.')
      setTwoFACode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 gradient-brand flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full border border-white/10" />
        <Link to="/" className="flex items-center gap-3 font-bold text-2xl text-white relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          Arm Academy
        </Link>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-white/80 text-sm mb-6">
            <Sparkles className="h-4 w-4 text-amber-300" /> Built for Armenian learners
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Learn from Armenia's <span className="text-amber-300">best educators</span>
          </h2>
          <p className="text-indigo-200 mb-8 leading-relaxed">Join thousands of students growing their knowledge in mathematics, sciences, languages, and more.</p>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-center gap-3 text-indigo-100 text-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-amber-300" />
                </div>
                {h}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
          <p className="text-white/90 text-sm leading-relaxed italic">"Arm Academy transformed how I learn. The live sessions feel just like being in a real classroom."</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-8 w-8 rounded-full bg-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-sm">A</div>
            <div>
              <div className="text-white font-medium text-sm">Ani Mkrtchyan</div>
              <div className="text-indigo-300 text-xs">Student, Yerevan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand"><BookOpen className="h-4 w-4 text-white" /></div>
            Arm Academy
          </Link>

          {step === 'credentials' ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
                <p className="text-slate-500 mt-2">Sign in to continue your learning journey.</p>
              </div>

              <form onSubmit={handleCredentials} className="space-y-5">
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 flex gap-2">
                    <span className="shrink-0">⚠</span> {error}
                  </div>
                )}
                <div>
                  <Label htmlFor="email" className="text-slate-700">Email or username</Label>
                  <Input id="email" name="email" type="text" autoComplete="username" placeholder="you@example.com"
                    value={form.email} onChange={handleChange} required className="mt-1.5 h-11 border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="password" className="text-slate-700">Password</Label>
                  <div className="relative mt-1.5">
                    <Input id="password" name="password" type={showPass ? 'text' : 'password'} autoComplete="current-password"
                      placeholder="••••••••" value={form.password} onChange={handleChange} required className="h-11 border-slate-200 pr-11" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Forgot your password?
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-slate-500 text-sm">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-semibold text-primary hover:underline">Create one free →</Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Two-factor authentication</h1>
                <p className="text-slate-500 mt-2 text-sm">Open your authenticator app and enter the 6-digit code.</p>
              </div>

              <form onSubmit={handle2FA} className="space-y-6">
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 text-center">
                    {error}
                  </div>
                )}
                <OTPInput value={twoFACode} onChange={setTwoFACode} length={6} />
                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading || twoFACode.length < 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Sign in'}
                </Button>
              </form>

              <button onClick={() => { setStep('credentials'); setTwoFACode(''); setError('') }}
                className="mt-6 block w-full text-center text-sm text-slate-500 hover:text-primary">
                ← Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
