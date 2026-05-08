import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Mail, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'

function OTPInput({ value, onChange, disabled }) {
  const length = 6
  const digits = value.padEnd(length, '').split('').slice(0, length)

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = digits.slice(); next[i] = ''
      onChange(next.join('').trimEnd())
      if (i > 0) document.getElementById(`v-otp-${i - 1}`)?.focus()
    }
  }

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = digits.slice(); next[i] = char
    onChange(next.join('').replace(/ /g, ''))
    if (char && i < length - 1) document.getElementById(`v-otp-${i + 1}`)?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    document.getElementById(`v-otp-${Math.min(pasted.length, length - 1)}`)?.focus()
    e.preventDefault()
  }

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input key={i} id={`v-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''} onChange={(e) => handleChange(i, e)} onKeyDown={(e) => handleKey(i, e)}
          disabled={disabled}
          className="h-14 w-12 rounded-xl border-2 bg-slate-50 text-center text-xl font-bold outline-none transition-all focus:border-primary focus:bg-white focus:shadow-sm disabled:opacity-50"
        />
      ))}
    </div>
  )
}

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()
  const email = searchParams.get('email') || ''

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Start cooldown when page loads (OTP was just sent on register)
  useEffect(() => {
    setCooldown(60)
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !loading) handleVerify()
  }, [code])

  const handleVerify = async () => {
    if (code.length < 6) return
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.verifyEmail(email, code)
      login(data.user, { access: data.access, refresh: data.refresh })
      toast({ title: 'Email verified! 🎉', description: 'Welcome to Arm Academy.', variant: 'success' })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code.')
      setCode('')
      document.getElementById('v-otp-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    try {
      await authApi.resendEmailOTP(email)
      setCooldown(60)
      setError('')
      setCode('')
      toast({ title: 'Code resent!', description: 'Check your email.', variant: 'success' })
    } catch {
      toast({ title: 'Failed to resend', variant: 'destructive' })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl text-primary mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          Arm Academy
        </Link>

        <div className="bg-white rounded-2xl shadow-card border p-8 text-center">
          {/* Icon */}
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 mb-6">
            <Mail className="h-10 w-10 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-500 text-sm mb-1">We sent a 6-digit verification code to</p>
          <p className="font-semibold text-slate-800 mb-8 text-sm">{email}</p>

          {/* OTP input */}
          <div className="mb-6">
            <OTPInput value={code} onChange={setCode} disabled={loading} />
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <Button
            className="w-full h-11 text-base font-semibold mb-4"
            onClick={handleVerify}
            disabled={loading || code.length < 6}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Verify Email</>}
          </Button>

          <div className="text-sm text-slate-500">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="font-semibold text-primary hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400">
            Wrong email?{' '}
            <Link to="/register" className="text-primary hover:underline">Go back and re-register</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
