import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Pencil, Trash2, Globe, EyeOff,
  Play, Video, MessageSquare, MapPin, Clock, Loader2, Users,
  Calendar, Save,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/useToast'
import { coursesApi, classesApi } from '@/api/courses'
import api from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { formatDateTime, cn } from '@/lib/utils'

const CLASS_TYPES = [
  { value: 'live',      label: 'Live Class',     icon: Video,          color: 'text-red-600 bg-red-50' },
  { value: 'recorded',  label: 'Recorded',       icon: Play,           color: 'text-blue-600 bg-blue-50' },
  { value: 'chat',      label: 'Chat Session',   icon: MessageSquare,  color: 'text-violet-600 bg-violet-50' },
  { value: 'in_person', label: 'In Person',      icon: MapPin,         color: 'text-emerald-600 bg-emerald-50' },
]

const CLASS_STATUSES = ['scheduled', 'ongoing', 'completed', 'cancelled']

const emptyClass = {
  title: '', description: '', class_type: 'live', status: 'scheduled',
  scheduled_start: '', scheduled_end: '', duration_minutes: '',
  meeting_url: '', recording_link: '', location: '', max_students: '',
  is_preview: false, section: '',
}

// ── Section modal ──────────────────────────────────────────────────────────────
function SectionModal({ courseId, editing, onClose }) {
  const queryClient = useQueryClient()
  const [title, setTitle]       = useState(editing?.title || '')
  const [desc, setDesc]         = useState(editing?.description || '')
  const [order, setOrder]       = useState(editing?.order ?? 0)

  const mutation = useMutation({
    mutationFn: (data) =>
      editing
        ? api.patch(`/sections/${editing.id}/`, data)
        : api.post('/sections/', { ...data, course: courseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-sections', String(courseId)] })
      toast({ title: editing ? 'Section updated!' : 'Section added!', variant: 'success' })
      onClose()
    },
    onError: (err) => toast({ title: 'Failed', description: err.response?.data?.detail, variant: 'destructive' }),
  })

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    mutation.mutate({ title, description: desc, order: Number(order) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold">{editing ? 'Edit Section' : 'Add Section'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div><Label>Section Title <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 1: Introduction" className="mt-1.5" /></div>
          <div><Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="mt-1.5" /></div>
          <div><Label>Display Order</Label>
            <Input type="number" min="0" value={order} onChange={e => setOrder(e.target.value)} className="mt-1.5 w-24" /></div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || !title.trim()}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Save' : 'Add Section'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Class form modal ──────────────────────────────────────────────────────────
function ClassModal({ courseId, editing, sections, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(editing ? {
    title: editing.title,
    description: editing.description || '',
    class_type: editing.class_type,
    status: editing.status,
    scheduled_start: editing.scheduled_start?.slice(0, 16) || '',
    scheduled_end: editing.scheduled_end?.slice(0, 16) || '',
    duration_minutes: editing.duration_minutes || '',
    meeting_url: editing.meeting_url || '',
    recording_link: editing.recording_link || '',
    location: editing.location || '',
    max_students: editing.max_students || '',
    is_preview: editing.is_preview || false,
    section: editing.section || '',
    order: editing.order ?? 0,
  } : { ...emptyClass })

  const isLive = form.class_type === 'live'
  const isRecorded = form.class_type === 'recorded'
  const isInPerson = form.class_type === 'in_person'

  const mutation = useMutation({
    mutationFn: (data) =>
      editing
        ? classesApi.update(editing.id, data)
        : classesApi.create({ ...data, course: courseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-classes', String(courseId)] })
      toast({ title: editing ? 'Class updated!' : 'Class added!', variant: 'success' })
      onClose()
    },
    onError: (err) => {
      toast({ title: 'Failed to save class', description: err.response?.data?.detail, variant: 'destructive' })
    },
  })

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast({ title: 'Title is required', variant: 'destructive' })
    const payload = { ...form }
    if (!payload.scheduled_start) delete payload.scheduled_start
    if (!payload.scheduled_end) delete payload.scheduled_end
    if (!payload.duration_minutes) delete payload.duration_minutes
    if (!payload.max_students) delete payload.max_students
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-lg">{editing ? 'Edit Class' : 'Add New Class'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input name="title" value={form.title} onChange={handle} placeholder="e.g. Introduction to Derivatives" className="mt-1.5" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea name="description" value={form.description} onChange={handle} rows={2} className="mt-1.5" placeholder="What will be covered?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Class Type</Label>
              <Select name="class_type" value={form.class_type} onChange={handle} className="mt-1.5">
                {CLASS_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" value={form.status} onChange={handle} className="mt-1.5">
                {CLASS_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </div>
          </div>

          {(isLive || form.class_type !== 'recorded') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input name="scheduled_start" type="datetime-local" value={form.scheduled_start} onChange={handle} className="mt-1.5" />
              </div>
              <div>
                <Label>End Time</Label>
                <Input name="scheduled_end" type="datetime-local" value={form.scheduled_end} onChange={handle} className="mt-1.5" />
              </div>
            </div>
          )}

          {isLive && (
            <div>
              <Label>Meeting URL</Label>
              <Input name="meeting_url" value={form.meeting_url} onChange={handle} placeholder="https://meet.google.com/…" className="mt-1.5" />
            </div>
          )}

          {isRecorded && (
            <div>
              <Label>Recording Link</Label>
              <Input name="recording_link" value={form.recording_link} onChange={handle} placeholder="https://…" className="mt-1.5" />
            </div>
          )}

          {isInPerson && (
            <div>
              <Label>Location</Label>
              <Input name="location" value={form.location} onChange={handle} placeholder="e.g. Room 204, YSU Building A" className="mt-1.5" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (minutes)</Label>
              <Input name="duration_minutes" type="number" min="1" value={form.duration_minutes} onChange={handle} placeholder="90" className="mt-1.5" />
            </div>
            <div>
              <Label>Max Students</Label>
              <Input name="max_students" type="number" min="1" value={form.max_students} onChange={handle} placeholder="Unlimited" className="mt-1.5" />
            </div>
          </div>

          {/* Section assignment */}
          {sections && sections.length > 0 && (
            <div>
              <Label>Section <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select name="section" value={form.section || ''} onChange={handle} className="mt-1.5">
                <option value="">No section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Display Order</Label>
              <Input name="order" type="number" min="0" value={form.order ?? 0} onChange={handle} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="is_preview" checked={form.is_preview}
                onChange={e => setForm(f => ({...f, is_preview: e.target.checked}))} className="rounded" />
              <label htmlFor="is_preview" className="text-sm font-medium cursor-pointer">
                Free preview <span className="text-xs text-muted-foreground">(visible to non-enrolled)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Save Changes' : 'Add Class'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ManageCourse() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [showModal, setShowModal]         = useState(false)
  const [editingClass, setEditingClass]   = useState(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [detailForm, setDetailForm]       = useState(null)
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [editingSection, setEditingSection]     = useState(null)

  const { data: course, isLoading } = useQuery({
    queryKey: ['manage-course', id],
    queryFn: () => coursesApi.get(id).then((r) => r.data),
    onSuccess: (c) => { if (!detailForm) setDetailForm({ title: c.title, description: c.description }) },
  })

  const { data: classesRaw } = useQuery({
    queryKey: ['manage-classes', id],
    queryFn: () => coursesApi.classes(id).then((r) => r.data),
    enabled: !!id,
  })

  const { data: sectionsRaw } = useQuery({
    queryKey: ['manage-sections', id],
    queryFn: () => api.get('/sections/', { params: { course: id } }).then(r => r.data),
    enabled: !!id,
  })
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : (sectionsRaw?.results || [])

  const deleteSectionMutation = useMutation({
    mutationFn: (secId) => api.delete(`/sections/${secId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-sections', id] })
      toast({ title: 'Section removed', variant: 'success' })
    },
  })
  const classes = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.results || [])

  const updateMutation = useMutation({
    mutationFn: (data) => coursesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-course', id] })
      setEditingDetails(false)
      toast({ title: 'Course updated!', variant: 'success' })
    },
  })

  const publishMutation = useMutation({
    mutationFn: (pub) => pub ? coursesApi.publish(id) : coursesApi.unpublish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manage-course', id] }),
  })

  const deleteClassMutation = useMutation({
    mutationFn: (classId) => classesApi.delete(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-classes', id] })
      toast({ title: 'Class removed', variant: 'success' })
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="container py-10 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!course) return null

  // Guard: only the owner can manage
  if (course.tutor !== user?.id && user?.role !== 'admin') {
    navigate('/dashboard'); return null
  }

  const df = detailForm || { title: course.title, description: course.description }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      {(showModal || editingClass) && (
        <ClassModal
          courseId={Number(id)}
          editing={editingClass}
          sections={sections}
          onClose={() => { setShowModal(false); setEditingClass(null) }}
        />
      )}
      {(showSectionModal || editingSection) && (
        <SectionModal
          courseId={Number(id)}
          editing={editingSection}
          onClose={() => { setShowSectionModal(false); setEditingSection(null) }}
        />
      )}

      <div className="container max-w-3xl py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{course.title}</h1>
              <Badge variant={course.is_published ? 'success' : 'secondary'}>
                {course.is_published ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm capitalize">{course.category} · {course.level}</p>
          </div>
          <Button
            variant={course.is_published ? 'outline' : 'default'}
            onClick={() => publishMutation.mutate(!course.is_published)}
            disabled={publishMutation.isPending}
            className="shrink-0"
          >
            {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> :
              course.is_published
                ? <><EyeOff className="h-4 w-4 mr-1.5" />Unpublish</>
                : course.moderation_status === 'pending_review'
                  ? <>⏳ Under Review</>
                  : <><Globe className="h-4 w-4 mr-1.5" />Submit for Review</>}
          </Button>
        </div>

        {/* Moderation status alert */}
        {course.moderation_status === 'pending_review' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            ⏳ <strong>Under Review</strong> — Your course has been submitted and is awaiting admin approval. You'll be notified once reviewed.
          </div>
        )}
        {course.moderation_status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            ❌ <strong>Rejected</strong>
            {course.rejection_reason && <span> — {course.rejection_reason}</span>}
            <p className="mt-2">Please update your course and resubmit for review.</p>
          </div>
        )}
        {course.moderation_status === 'suspended' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            🚫 <strong>Suspended</strong>
            {course.rejection_reason && <span> — {course.rejection_reason}</span>}
          </div>
        )}

        {/* Stats strip */}
        <div className="bg-white rounded-2xl border p-4 grid grid-cols-3 divide-x text-center">
          {[
            { icon: Users,    val: course.total_students || 0,                      label: 'Students' },
            { icon: Clock,    val: classes.length,                                  label: 'Classes' },
            { icon: Calendar, val: Number(course.average_rating || 0).toFixed(1),  label: 'Avg Rating' },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="px-4">
              <div className="flex items-center justify-center gap-1.5 text-2xl font-bold">
                <Icon className="h-5 w-5 text-primary" /> {val}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Course details */}
        <section className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Course Details</h2>
            {!editingDetails
              ? <Button variant="ghost" size="sm" onClick={() => setEditingDetails(true)}><Pencil className="h-4 w-4 mr-1.5" />Edit</Button>
              : <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateMutation.mutate(df)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDetails(false)}>Cancel</Button>
                </div>
            }
          </div>
          {editingDetails ? (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={df.title} onChange={(e) => setDetailForm((f) => ({ ...f, title: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={df.description} onChange={(e) => setDetailForm((f) => ({ ...f, description: e.target.value }))} rows={4} className="mt-1.5" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
          )}
        </section>

        {/* Sections */}
        <section className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold">Sections</h2>
              <p className="text-sm text-muted-foreground">Group lectures into chapters for a better learning experience</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowSectionModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Add Section
            </Button>
          </div>

          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No sections yet — classes will appear as a flat list.</p>
          ) : (
            <div className="space-y-2">
              {sections.sort((a,b) => a.order - b.order).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50 group">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {s.order + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{s.title}</div>
                    {s.description && <div className="text-xs text-muted-foreground truncate">{s.description}</div>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingSection(s)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm('Delete this section?')) deleteSectionMutation.mutate(s.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Classes */}
        <section className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold">Classes / Lectures</h2>
              <p className="text-sm text-muted-foreground">{classes.length} lecture{classes.length !== 1 ? 's' : ''} in this course</p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Class
            </Button>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-xl">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No classes yet</p>
              <p className="text-sm text-muted-foreground mb-4">Add your first class to get started.</p>
              <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-1.5" />Add Class</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {classes.map((cls) => {
                const typeInfo = CLASS_TYPES.find((t) => t.value === cls.class_type) || CLASS_TYPES[0]
                const Icon = typeInfo.icon
                return (
                  <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl border hover:border-primary/30 hover:bg-slate-50 transition-all group">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', typeInfo.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{cls.title}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="capitalize">{cls.class_type.replace('_', ' ')}</span>
                        {cls.scheduled_start && <span>{formatDateTime(cls.scheduled_start)}</span>}
                        {cls.duration_minutes && <span>{cls.duration_minutes}m</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs shrink-0">{cls.status}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingClass(cls)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this class?')) deleteClassMutation.mutate(cls.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* View course link */}
        <div className="text-center pb-8">
          <Button variant="outline" asChild>
            <Link to={`/courses/${id}`}>View Public Course Page →</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
