import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function OTPInput({ value, onChange, disabled }) {
  const len = 6
  const digits = value.padEnd(len, '').split('').slice(0, len)
  const handle = (i, e) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1)
    const next = digits.slice(); next[i] = ch
    onChange(next.join('').replace(/ /g, ''))
    if (ch && i < len - 1) document.getElementById(`rp-otp-${i + 1}`)?.focus()
  }
  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = digits.slice(); next[i] = ''
      onChange(next.join('').trimEnd())
      if (i > 0) document.getElementById(`rp-otp-${i - 1}`)?.focus()
    }
  }
  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, len)
    onChange(p); e.preventDefault()
  }
  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length: len }).map((_, i) => (
        <input key={i} id={`rp-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''} onChange={(e) => handle(i, e)} onKeyDown={(e) => handleKey(i, e)}
          disabled={disabled}
          className="h-14 w-12 rounded-xl border-2 bg-slate-50 text-center text-xl font-bold outline-none transition-all focus:border-primary focus:bg-white" />
      ))}
    </div>
  )
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const { login } = useAuthStore()
  const email = sp.get('email') || ''

  const [code, setCode]         = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (code.length === 6 && password.length >= 8) handleSubmit()
  }, [code])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (code.length < 6) return
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setError(''); setLoading(true)
    try {
      const { data } = await authApi.resetPassword(email, code, password)
      login(data.user, { access: data.access, refresh: data.refresh })
      toast({ title: 'Password reset!', description: 'You are now logged in.', variant: 'success' })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl text-primary mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          Arm Academy
        </Link>

        <div className="bg-white rounded-2xl border shadow-card p-8">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="text-slate-500 text-sm mt-2">
              Enter the code sent to <strong>{email}</strong> and your new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="block text-center mb-3">6-digit code</Label>
              <OTPInput value={code} onChange={setCode} disabled={loading} />
            </div>

            <div>
              <Label>New Password</Label>
              <div className="relative mt-1.5">
                <Input type={showPass ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters" className="h-11 pr-11" required minLength={8} />
                <button type="button" tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button type="submit" className="w-full h-11" disabled={loading || code.length < 6 || password.length < 8}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-2" />Reset Password</>}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            Didn't get a code?{' '}
            <Link to="/forgot-password" className="text-primary hover:underline font-medium">Resend</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
