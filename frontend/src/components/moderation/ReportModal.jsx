import { useState } from 'react'
import { Flag, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/useToast'
import api from '@/api/client'

const REASONS = [
  { value: 'inappropriate',  label: 'Inappropriate Content' },
  { value: 'copyright',      label: 'Copyright Infringement / DMCA' },
  { value: 'spam',           label: 'Spam or Misleading Information' },
  { value: 'hate_speech',    label: 'Hate Speech or Discrimination' },
  { value: 'illegal',        label: 'Illegal Content' },
  { value: 'underage',       label: 'Child Safety Concern' },
  { value: 'violence',       label: 'Violence or Graphic Content' },
  { value: 'adult_ungated',  label: 'Adult Content Without Age Verification' },
  { value: 'impersonation',  label: 'Impersonation or Fake Profile' },
  { value: 'other',          label: 'Other' },
]

/**
 * Universal report modal.
 * Pass one of: courseId, reviewId, userId, classId
 */
export default function ReportModal({ courseId, reviewId, userId, classId, onClose }) {
  const [reason, setReason]           = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason) return
    setLoading(true)
    try {
      await api.post('/moderation/reports/', {
        reason,
        description,
        ...(courseId  ? { course: courseId }           : {}),
        ...(reviewId  ? { review: reviewId }           : {}),
        ...(userId    ? { reported_user: userId }      : {}),
        ...(classId   ? { class_session: classId }     : {}),
      })
      toast({ title: 'Report submitted', description: 'Our moderation team will review it shortly.', variant: 'success' })
      onClose()
    } catch (err) {
      toast({ title: 'Failed to submit report', description: err.response?.data?.detail, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            <h2 className="font-bold text-lg">Report Content</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label>Reason <span className="text-red-500">*</span></Label>
            <Select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5" required>
              <option value="">Select a reason…</option>
              {REASONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Additional Details <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details to help our moderators understand the issue…"
              rows={3}
              className="mt-1.5"
              maxLength={1000}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            ⚠️ False reports may result in action against your account. Only report genuine violations.
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" variant="destructive" className="flex-1" disabled={!reason || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
              Submit Report
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
