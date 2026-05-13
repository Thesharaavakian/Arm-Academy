import { useState, useEffect } from 'react'
import { Cookie, X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

const KEY = 'arm_academy_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      // Small delay so it doesn't flash on initial load
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  const accept = () => { localStorage.setItem(KEY, 'accepted'); setVisible(false) }
  const decline = () => { localStorage.setItem(KEY, 'declined'); setVisible(false) }

  if (!visible) return null

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6',
      'animate-slide-up',
    )}>
      <div className="mx-auto max-w-3xl bg-slate-900 text-white rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shrink-0">
          <Cookie className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">We use cookies</p>
          <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
            Arm Academy uses essential cookies to keep you logged in and remember your preferences.
            We don't sell your data or use tracking cookies.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={decline}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white bg-transparent h-9">
            Decline
          </Button>
          <Button size="sm" onClick={accept} className="h-9 shrink-0">
            Accept
          </Button>
        </div>

        <button onClick={decline} className="absolute top-4 right-4 text-slate-400 hover:text-white sm:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
