import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, Loader2, ArrowRight, Sparkles, GraduationCap, Briefcase } from 'lucide-react'
import { authApi } from '@/api/auth'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function RoleCard({ role, selected, onSelect, icon: Icon, title, description }) {
  return (
    <button type="button" onClick={() => onSelect(role)}
      className={cn('relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-5 text-center transition-all duration-200',
        selected ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50')}>
      {selected && <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-white" /></div>}
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl transition-colors', selected ? 'gradient-brand' : 'bg-slate-100')}>
        <Icon className={cn('h-6 w-6', selected ? 'text-white' : 'text-slate-500')} />
      </div>
      <div>
        <div className="font-semibold text-sm text-slate-800">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      </div>
    </button>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '', email: '', password: '', password2: '',
    role: searchParams.get('role') === 'tutor' ? 'tutor' : 'student',
    // honeypot — never shown to user, bots fill these in
    website: '', phone_confirm: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.first_name.trim()) errs.first_name = 'Required'
    if (!form.username.trim()) errs.username = 'Required'
    if (!form.email.trim()) errs.email = 'Required'
    if (form.password.length < 8) errs.password = 'Minimum 8 characters'
    if (form.password !== form.password2) errs.password2 = 'Passwords do not match'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setErrors({})
    try {
      const { data } = await authApi.register(form)
      // Backend returns requires_verification — redirect to email verify page
      if (data.requires_verification) {
        toast({ title: 'Account created!', description: 'Check your email for a verification code.', variant: 'success' })
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
      }
    } catch (err) {
      const d = err.response?.data || {}
      if (typeof d === 'object' && !Array.isArray(d)) setErrors(d)
      else setErrors({ general: 'Registration failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const fieldErr = (name) => errors[name] ? (
    <p className="text-xs text-red-500 mt-1">{Array.isArray(errors[name]) ? errors[name][0] : errors[name]}</p>
  ) : null

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 gradient-brand flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full border border-white/10" />
        <Link to="/" className="flex items-center gap-3 font-bold text-2xl text-white relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur"><BookOpen className="h-5 w-5 text-white" /></div>
          Arm Academy
        </Link>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-white/80 text-sm mb-6">
            <Sparkles className="h-4 w-4 text-amber-300" /> Free to join, free to learn
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">Start your learning <br /><span className="text-amber-300">journey today</span></h2>
          <p className="text-indigo-200 leading-relaxed mb-8">Create your account and get instant access to hundreds of courses taught by Armenia's best educators.</p>
          <div className="grid grid-cols-2 gap-4">
            {[{ n: '500+', l: 'Courses' }, { n: '2FA', l: 'Secure login' }, { n: '100%', l: 'Armenian' }, { n: 'Free', l: 'To start' }].map(({ n, l }) => (
              <div key={l} className="bg-white/10 rounded-xl p-4 backdrop-blur">
                <div className="text-2xl font-bold text-white">{n}</div>
                <div className="text-indigo-300 text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-indigo-300 text-xs">
          Already have an account? <Link to="/login" className="text-white font-medium underline underline-offset-2">Sign in</Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand"><BookOpen className="h-4 w-4 text-white" /></div>
            Arm Academy
          </Link>

          <div className="mb-7">
            <h1 className="text-3xl font-bold text-slate-900">Create account</h1>
            <p className="text-slate-500 mt-2">Join the Armenian learning community.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot — invisible to real users, bots fill these in */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
              <input name="website" tabIndex={-1} autoComplete="off"
                value={form.website} onChange={handleChange} />
              <input name="phone_confirm" tabIndex={-1} autoComplete="off"
                value={form.phone_confirm} onChange={handleChange} />
            </div>

            {errors.general && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">{errors.general}</div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-700">I want to</Label>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard role="student" selected={form.role === 'student'} onSelect={(r) => setForm((f) => ({ ...f, role: r }))}
                  icon={GraduationCap} title="Learn" description="I'm a student" />
                <RoleCard role="tutor" selected={form.role === 'tutor'} onSelect={(r) => setForm((f) => ({ ...f, role: r }))}
                  icon={Briefcase} title="Teach" description="I'm a tutor" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-700">First name</Label>
                <Input name="first_name" placeholder="Ara" value={form.first_name} onChange={handleChange} className="mt-1.5 h-11 border-slate-200" />
                {fieldErr('first_name')}</div>
              <div><Label className="text-slate-700">Last name</Label>
                <Input name="last_name" placeholder="Petrosyan" value={form.last_name} onChange={handleChange} className="mt-1.5 h-11 border-slate-200" /></div>
            </div>

            <div><Label className="text-slate-700">Username</Label>
              <Input name="username" placeholder="ara.petrosyan" value={form.username} onChange={handleChange} required className="mt-1.5 h-11 border-slate-200" />
              {fieldErr('username')}</div>

            <div><Label className="text-slate-700">Email address</Label>
              <Input name="email" type="email" placeholder="ara@example.com" value={form.email} onChange={handleChange} required className="mt-1.5 h-11 border-slate-200" />
              {fieldErr('email')}</div>

            <div><Label className="text-slate-700">Password</Label>
              <div className="relative mt-1.5">
                <Input name="password" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={form.password} onChange={handleChange} required className="h-11 border-slate-200 pr-11" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErr('password')}</div>

            <div><Label className="text-slate-700">Confirm password</Label>
              <Input name="password2" type="password" placeholder="Repeat password" value={form.password2} onChange={handleChange} required className="mt-1.5 h-11 border-slate-200" />
              {fieldErr('password2')}</div>

            <Button type="submit" className="w-full h-11 text-base font-semibold mt-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4 ml-1" /></>}
            </Button>

            <p className="text-xs text-center text-slate-400">By signing up you agree to our Terms of Service and Privacy Policy.</p>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm">Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in →</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
