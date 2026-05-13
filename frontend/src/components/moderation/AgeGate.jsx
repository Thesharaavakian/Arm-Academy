import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/api/client'
import { toast } from '@/hooks/useToast'

/**
 * Blocks access to 18+ content.
 * - If not authenticated → prompt to sign in
 * - If authenticated but no DOB → ask for date of birth, save to profile
 * - If authenticated and under 18 → permanent block
 * - If authenticated and 18+ → renders children
 */
export default function AgeGate({ children }) {
  const { user, updateUser, isAuthenticated } = useAuthStore()
  const [dob, setDob]         = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  // Check if user already has a verified DOB on file
  const hasVerifiedAge = (() => {
    if (!user?.date_of_birth) return false
    const birth = new Date(user.date_of_birth)
    const age   = Math.floor((Date.now() - birth) / (365.25 * 24 * 3600 * 1000))
    return age >= 18
  })()

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">🔞</div>
          <h2 className="text-xl font-bold mb-2">18+ Content</h2>
          <p className="text-muted-foreground text-sm mb-6">
            This course contains adult-only content. Please sign in and confirm your age to continue.
          </p>
          <Button className="w-full" asChild>
            <a href="/login">Sign In to Continue</a>
          </Button>
        </div>
      </div>
    )
  }

  if (hasVerifiedAge || confirmed) {
    return children
  }

  // User has a DOB set but is under 18
  if (user?.date_of_birth) {
    const birth = new Date(user.date_of_birth)
    const age   = Math.floor((Date.now() - birth) / (365.25 * 24 * 3600 * 1000))
    if (age < 18) {
      return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-4">🔞</div>
            <h2 className="text-xl font-bold mb-2">Age Restricted</h2>
            <p className="text-muted-foreground text-sm">
              This content is restricted to users 18 years of age or older.
              You do not meet the age requirement.
            </p>
          </div>
        </div>
      )
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!dob) return
    const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
    if (age < 18) {
      toast({ title: 'Age restriction', description: 'You must be 18 or older to access this content.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const { data } = await api.patch('/users/profile/', { date_of_birth: dob })
      updateUser(data)
      setConfirmed(true)
      toast({ title: 'Age verified ✓', variant: 'success' })
    } catch {
      toast({ title: 'Could not save age', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔞</div>
          <h2 className="text-xl font-bold mb-2">18+ Content</h2>
          <p className="text-muted-foreground text-sm">
            This course contains adult-only content. Please confirm your date of birth to continue.
            Your information is stored securely and never shared.
          </p>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]}
              required
              className="mt-1.5"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button type="submit" className="flex-1" disabled={!dob || loading}>
              I am 18 or older
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By proceeding you confirm you are 18+ and consent to accessing adult content.
        </p>
      </div>
    </div>
  )
}
