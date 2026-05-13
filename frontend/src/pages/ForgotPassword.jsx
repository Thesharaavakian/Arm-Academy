import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Mail, Loader2, ArrowLeft } from 'lucide-react'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
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
          {!sent ? (
            <>
              <div className="text-center mb-7">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Forgot your password?</h1>
                <p className="text-slate-500 text-sm mt-2">
                  Enter your email and we'll send you a reset code.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Email address</Label>
                  <Input
                    type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    className="mt-1.5 h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Code'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-slate-500 text-sm mb-6">
                If <strong>{email}</strong> is registered, you'll receive a 6-digit reset code shortly.
              </p>
              <Button asChild className="w-full h-11">
                <Link to={`/reset-password?email=${encodeURIComponent(email)}`}>
                  Enter Reset Code →
                </Link>
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
