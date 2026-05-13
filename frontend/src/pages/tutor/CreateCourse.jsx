import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, BookOpen, Upload, Check, Loader2, ImageIcon,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'
import { coursesApi } from '@/api/courses'
import { cn } from '@/lib/utils'
import api from '@/api/client'

const CATEGORIES = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Armenian Language', 'History', 'English', 'Computer Science',
  'Art & Music', 'Economics', 'Geography', 'Other',
]

const LEVELS = [
  { value: 'beginner',     label: 'Beginner — No prior knowledge needed' },
  { value: 'intermediate', label: 'Intermediate — Some basics required' },
  { value: 'advanced',     label: 'Advanced — Strong background needed' },
]

export default function CreateCourse() {
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    is_free: true,
    is_published: false,
  })
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  const handleCover = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.description.trim()) errs.description = 'Description is required'
    if (!form.category) errs.category = 'Please select a category'
    return errs
  }

  const createMutation = useMutation({
    mutationFn: async (publish) => {
      const formData = new FormData()
      Object.entries({ ...form, is_published: publish }).forEach(([k, v]) => {
        formData.append(k, v)
      })
      if (coverFile) formData.append('cover_image', coverFile)
      const { data } = await api.post('/courses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: (course) => {
      toast({
        title: form.is_published ? 'Course published!' : 'Course saved as draft',
        description: 'You can now add classes to your course.',
        variant: 'success',
      })
      navigate(`/courses/${course.id}/manage`)
    },
    onError: (err) => {
      const d = err.response?.data
      if (d && typeof d === 'object') setErrors(d)
      toast({ title: 'Failed to create course', variant: 'destructive' })
    },
  })

  const handleSubmit = (publish) => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    createMutation.mutate(publish)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <div className="container max-w-3xl py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create a New Course</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Fill in the details below. You can always edit later.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic info */}
          <section className="bg-white rounded-2xl border p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-bold">Course Information</h2>
            </div>

            <div>
              <Label htmlFor="title">
                Course Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title" name="title"
                placeholder="e.g. Advanced Calculus for Engineers"
                value={form.title} onChange={handleChange}
                className={cn('mt-1.5 h-11', errors.title && 'border-red-400')}
                maxLength={200}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description" name="description"
                placeholder="Describe what students will learn, who this is for, and what makes this course valuable…"
                value={form.description} onChange={handleChange} rows={5}
                className={cn('mt-1.5', errors.description && 'border-red-400')}
                maxLength={3000}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.description
                  ? <p className="text-xs text-red-500">{errors.description}</p>
                  : <span />}
                <span className="text-xs text-muted-foreground">{form.description.length}/3000</span>
              </div>
            </div>
          </section>

          {/* Details */}
          <section className="bg-white rounded-2xl border p-6 space-y-5">
            <h2 className="font-bold">Category &amp; Level</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="category" name="category"
                  value={form.category} onChange={handleChange}
                  className={cn('mt-1.5', errors.category && 'border-red-400')}
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>

              <div>
                <Label htmlFor="level">Level</Label>
                <Select id="level" name="level" value={form.level} onChange={handleChange} className="mt-1.5">
                  {LEVELS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </div>
            </div>
          </section>

          {/* Cover image */}
          <section className="bg-white rounded-2xl border p-6">
            <h2 className="font-bold mb-4">Cover Image</h2>
            <div
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors hover:border-primary/40 hover:bg-slate-50',
                coverPreview && 'border-primary/30',
              )}
              onClick={() => fileRef.current?.click()}
            >
              {coverPreview ? (
                <img
                  src={coverPreview} alt="Cover preview"
                  className="max-h-48 rounded-lg object-cover shadow-sm"
                />
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-600">Click to upload cover image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB. Recommended: 1280×720</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
            </div>
            {coverPreview && (
              <button
                type="button"
                className="mt-2 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                onClick={() => { setCoverPreview(null); setCoverFile(null) }}
              >
                Remove image
              </button>
            )}
          </section>

          {/* Pricing */}
          <section className="bg-white rounded-2xl border p-6">
            <h2 className="font-bold mb-4">Pricing</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { val: true,  label: 'Free',  desc: 'Anyone can enroll at no cost', icon: '🎁' },
                { val: false, label: 'Paid',  desc: 'Students pay to access this course', icon: '💎' },
              ].map(({ val, label, desc, icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_free: val }))}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                    form.is_free === val
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-primary/30',
                  )}
                >
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  {form.is_free === val && (
                    <div className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => handleSubmit(false)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save as Draft
            </Button>
            <Button
              type="button"
              className="flex-1 h-11"
              onClick={() => handleSubmit(true)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Publish Now →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
