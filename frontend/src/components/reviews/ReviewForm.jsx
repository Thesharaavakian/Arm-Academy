import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Loader2, Send, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { reviewsApi } from '@/api/courses'
import { cn } from '@/lib/utils'

function StarPicker({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(s)}
            className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
          >
            <Star
              className={cn(
                'h-8 w-8 transition-colors',
                s <= display ? 'fill-amber-400 text-amber-400' : 'text-slate-200',
              )}
            />
          </button>
        ))}
        {display > 0 && (
          <span className="ml-2 text-sm font-medium text-slate-600">{labels[display]}</span>
        )}
      </div>
    </div>
  )
}

export default function ReviewForm({ courseId, existingReview, onSuccess }) {
  const queryClient = useQueryClient()
  const isEdit = !!existingReview

  const [form, setForm] = useState({
    rating: existingReview?.rating || 0,
    title: existingReview?.title || '',
    comment: existingReview?.comment || '',
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? reviewsApi.update(existingReview.id, data)
        : reviewsApi.create({ ...data, course: courseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-reviews', String(courseId)] })
      queryClient.invalidateQueries({ queryKey: ['my-review', String(courseId)] })
      toast({
        title: isEdit ? 'Review updated!' : 'Review submitted!',
        description: 'Thank you for your feedback.',
        variant: 'success',
      })
      onSuccess?.()
    },
    onError: (err) => {
      toast({
        title: 'Failed to submit review',
        description: err.response?.data?.detail || 'Please try again.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.rating) {
      toast({ title: 'Please select a rating', variant: 'destructive' })
      return
    }
    if (!form.comment.trim()) {
      toast({ title: 'Please write a comment', variant: 'destructive' })
      return
    }
    mutation.mutate(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label className="text-slate-700 mb-2 block">Your Rating <span className="text-red-500">*</span></Label>
        <StarPicker
          value={form.rating}
          onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
          disabled={mutation.isPending}
        />
      </div>

      <div>
        <Label htmlFor="review-title" className="text-slate-700">Title (optional)</Label>
        <Input
          id="review-title"
          placeholder="Summarise your experience…"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          disabled={mutation.isPending}
          className="mt-1.5"
          maxLength={120}
        />
      </div>

      <div>
        <Label htmlFor="review-comment" className="text-slate-700">
          Your Review <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="review-comment"
          placeholder="What did you like or dislike? How did this course help you?"
          value={form.comment}
          onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          disabled={mutation.isPending}
          rows={4}
          className="mt-1.5"
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {form.comment.length}/2000
        </p>
      </div>

      <Button type="submit" disabled={mutation.isPending || !form.rating || !form.comment.trim()}>
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : isEdit ? (
          <Pencil className="h-4 w-4 mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        {isEdit ? 'Update Review' : 'Submit Review'}
      </Button>
    </form>
  )
}
