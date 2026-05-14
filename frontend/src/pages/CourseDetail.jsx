import { useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Star, Users, Clock, Award, ChevronRight, Play, MessageSquare,
  MapPin, Check, Loader2, Pencil, Settings, Flag, Lock, BookOpen,
  Video, ChevronDown, ChevronUp,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import VideoPlayer from '@/components/video/VideoPlayer'
import AgeGate from '@/components/moderation/AgeGate'
import ReportModal from '@/components/moderation/ReportModal'
import ReviewForm from '@/components/reviews/ReviewForm'
import { coursesApi } from '@/api/courses'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/useToast'
import { formatDateTime, getInitials, cn } from '@/lib/utils'
import api from '@/api/client'

const classTypeIcon  = { live: Play, recorded: Video, chat: MessageSquare, in_person: MapPin }
const classTypeBadge = { live: 'destructive', recorded: 'secondary', chat: 'outline', in_person: 'success' }

const CONTENT_RATING_BADGE = {
  teen:   { label: '13+',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  mature: { label: '16+',  color: 'bg-orange-50 text-orange-700 border-orange-200' },
  adult:  { label: '18+',  color: 'bg-red-50 text-red-700 border-red-200' },
}

// ── Section / Lecture accordion ───────────────────────────────────────────────
function CurriculumSection({ section, classes, onSelectClass, selectedClassId, isEnrolled, isOwner }) {
  const [open, setOpen] = useState(true)
  const sectionClasses  = section
    ? classes.filter(c => c.section === section.id)
    : classes

  return (
    <div className="border rounded-xl overflow-hidden mb-2">
      {section && (
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          onClick={() => setOpen(o => !o)}
        >
          <span className="font-semibold text-sm">{section.title}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{sectionClasses.length} lecture{sectionClasses.length !== 1 ? 's' : ''}</span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
      )}

      {(!section || open) && (
        <div className="divide-y">
          {sectionClasses.map(cls => {
            const Icon      = classTypeIcon[cls.class_type] || Play
            const isActive  = cls.id === selectedClassId
            const accessible = cls.is_accessible || cls.is_preview

            return (
              <button
                key={cls.id}
                onClick={() => accessible ? onSelectClass(cls) : null}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-all',
                  isActive && 'bg-primary/10 border-l-2 border-primary',
                  !isActive && accessible && 'hover:bg-slate-50',
                  !accessible && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                  isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500')}>
                  {accessible ? <Icon className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{cls.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground capitalize">{cls.class_type.replace('_', ' ')}</span>
                    {cls.duration_minutes && <span className="text-xs text-muted-foreground">{cls.duration_minutes}m</span>}
                    {cls.is_preview && !isEnrolled && (
                      <span className="text-xs text-emerald-600 font-medium">Free preview</span>
                    )}
                  </div>
                </div>
                {cls.scheduled_start && (
                  <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(cls.scheduled_start)}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CourseDetail() {
  const { id }         = useParams()
  const navigate       = useNavigate()
  const [sp]           = useSearchParams()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient    = useQueryClient()

  const [selectedClass, setSelectedClass] = useState(null)
  const [reviewEditMode, setReviewEditMode] = useState(false)
  const [showReport, setShowReport]       = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.get(id).then(r => r.data),
  })

  const { data: sectionsRaw } = useQuery({
    queryKey: ['course-sections', id],
    queryFn: () => coursesApi.sections(id).then(r => r.data),
    enabled: !!id,
  })

  const { data: classesRaw } = useQuery({
    queryKey: ['course-classes', id],
    queryFn: () => coursesApi.classes(id).then(r => r.data),
    enabled: !!id,
  })

  const { data: reviewsRaw } = useQuery({
    queryKey: ['course-reviews', id],
    queryFn: () => coursesApi.reviews(id).then(r => r.data),
    enabled: !!id,
  })

  const { data: myReviewData } = useQuery({
    queryKey: ['my-review', id],
    queryFn: () =>
      api.get('/reviews/', { params: { course: id, reviewer: user?.id } })
        .then(r => { const d = r.data; return (Array.isArray(d) ? d : d?.results || [])[0] || null }),
    enabled: !!isAuthenticated && !!user?.id,
  })

  const enrollMutation = useMutation({
    mutationFn: () => coursesApi.enroll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      toast({ title: 'Enrolled!', description: `You're now enrolled in "${course?.title}".`, variant: 'success' })
    },
    onError: (err) => {
      const d = err.response?.data
      if (d?.requires_payment) handlePayment()
      else toast({ title: 'Enrollment failed', description: d?.detail || 'Please try again.', variant: 'destructive' })
    },
  })

  const handlePayment = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    setPaymentLoading(true)
    try {
      const { data } = await api.post(`/payments/initiate/${id}/`)
      if (data.checkout_url) {
        // Stripe Checkout
        window.location.href = data.checkout_url
      } else if (data.manual) {
        if (data.paypal_link) {
          // Open PayPal.me in new tab and show confirmation message
          window.open(data.paypal_link, '_blank', 'noopener')
          toast({
            title: `Pay ${Number(data.amount_amd).toLocaleString()} ֏ via PayPal`,
            description: 'Complete the PayPal payment. Enrollment confirms automatically once received.',
          })
        } else {
          toast({
            title: `Contact tutor to pay ${Number(data.amount_amd).toLocaleString()} ֏`,
            description: data.detail,
          })
        }
      }
    } catch (err) {
      toast({ title: 'Payment failed', description: err.response?.data?.detail, variant: 'destructive' })
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleEnroll = () => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (!course?.is_free && course?.price_amd) { handlePayment(); return }
    enrollMutation.mutate()
  }

  const classes   = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.results || [])
  const sections  = Array.isArray(sectionsRaw) ? sectionsRaw : []
  const reviews   = Array.isArray(reviewsRaw)  ? reviewsRaw  : (reviewsRaw?.results || [])
  const isOwner   = course?.is_owner
  const isEnrolled = course?.is_enrolled || enrollMutation.isSuccess
  const canReview  = isAuthenticated && isEnrolled && !isOwner

  // ── Payment success from Stripe redirect ──────────────────────────────────
  const paymentResult = sp.get('payment')

  if (isLoading) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="container py-10 space-y-4">
          <Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-1/3" /><Skeleton className="h-60 w-full rounded-2xl" />
        </div>
      </div>
    )
  }
  if (!course) return null

  const ratingBadge = CONTENT_RATING_BADGE[course.content_rating]

  // Wrap entire page in AgeGate for adult content
  const content = (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Payment success banner */}
      {paymentResult === 'success' && (
        <div className="bg-emerald-500 text-white text-center py-3 text-sm font-medium">
          ✅ Payment confirmed — you are now enrolled!
        </div>
      )}
      {paymentResult === 'cancelled' && (
        <div className="bg-amber-500 text-white text-center py-3 text-sm font-medium">
          Payment was cancelled. You can try again below.
        </div>
      )}

      {/* Hero */}
      <div className="bg-slate-900 text-white py-10">
        <div className="container">
          <nav className="flex gap-2 items-center text-sm text-slate-400 mb-4">
            <Link to="/courses" className="hover:text-white">Courses</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">{course.title}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="info" className="capitalize">{course.level}</Badge>
              {course.is_free ? <Badge variant="success">Free</Badge>
                : course.price_amd && <Badge variant="outline" className="border-amber-400/50 text-amber-300">{Number(course.price_amd).toLocaleString()} ֏</Badge>}
              {course.category && <Badge variant="outline" className="border-white/30 text-white/80">{course.category}</Badge>}
              {ratingBadge && <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', ratingBadge.color)}>{ratingBadge.label}</span>}
              {course.moderation_status !== 'approved' && isOwner && (
                <Badge variant="outline" className="border-yellow-400/50 text-yellow-300 capitalize">
                  {course.moderation_status.replace('_', ' ')}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{course.title}</h1>
            <p className="text-slate-300 mb-4 max-w-2xl leading-relaxed">{course.description}</p>

            <div className="flex flex-wrap items-center gap-5 text-sm">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{Number(course.average_rating || 0).toFixed(1)}</span>
                <span className="text-slate-400">({course.total_reviews || 0} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                <span>{course.total_students || 0} students</span>
              </div>
              {course.language && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">🌍</span>
                  <span>{course.language}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <Link to={`/tutors/${course.tutor}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                <Avatar className="h-9 w-9 ring-2 ring-white/20 group-hover:ring-white/50 transition-all">
                  <AvatarFallback className="bg-indigo-600 text-white text-xs">{getInitials(course.tutor_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-xs text-slate-400">Instructor</span>
                  <div className="text-sm font-semibold text-white">{course.tutor_name}</div>
                </div>
              </Link>

              {/* Message tutor — only for enrolled non-owners */}
              {isAuthenticated && !isOwner && (
                <Button size="sm" variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                  onClick={() => navigate(`/messages?with=${course.tutor}`)}>
                  <MessageSquare className="h-4 w-4 mr-1.5" />Message Tutor
                </Button>
              )}
            </div>

            {/* Owner controls */}
            {isOwner && (
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent" asChild>
                  <Link to={`/courses/${id}/manage`}><Settings className="h-4 w-4 mr-2" />Manage</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 bg-slate-50">
        <div className="container py-8">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Main column */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Video player — shown when a lecture is selected */}
              {selectedClass && (
                <div className="bg-white rounded-2xl border overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{selectedClass.title}</h3>
                    <Badge variant="outline" className="capitalize text-xs">
                      {selectedClass.class_type.replace('_', ' ')}
                    </Badge>
                  </div>

                  {selectedClass.has_video && selectedClass.video_id ? (
                    <div className="p-4">
                      <VideoPlayer
                        videoId={selectedClass.video_id}
                        classTitle={selectedClass.title}
                        isPreview={selectedClass.is_preview}
                      />
                    </div>
                  ) : selectedClass.meeting_url ? (
                    <div className="p-6 text-center">
                      <Play className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">This is a live class.</p>
                      <Button asChild>
                        <a href={selectedClass.meeting_url} target="_blank" rel="noreferrer">Join Live Class →</a>
                      </Button>
                    </div>
                  ) : selectedClass.recording_link ? (
                    <div className="p-6 text-center">
                      <Video className="h-10 w-10 text-primary mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">External recording available.</p>
                      <Button asChild>
                        <a href={selectedClass.recording_link} target="_blank" rel="noreferrer">Watch Recording →</a>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      <Lock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Content not yet available.</p>
                    </div>
                  )}
                </div>
              )}

              {/* What you'll learn */}
              {course.what_you_learn && (
                <section className="bg-white rounded-2xl border p-6">
                  <h2 className="text-lg font-bold mb-4">What You'll Learn</h2>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {course.what_you_learn.split('\n').filter(Boolean).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Requirements */}
              {course.requirements && (
                <section className="bg-white rounded-2xl border p-6">
                  <h2 className="text-lg font-bold mb-3">Prerequisites</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{course.requirements}</p>
                </section>
              )}

              {/* Curriculum */}
              <section>
                <h2 className="text-xl font-bold mb-4">
                  Course Curriculum
                  <span className="text-base font-normal text-muted-foreground ml-2">({classes.length} lecture{classes.length !== 1 ? 's' : ''})</span>
                </h2>

                {classes.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-muted-foreground">No classes added yet.</div>
                ) : sections.length > 0 ? (
                  // Sectioned curriculum
                  <div className="space-y-2">
                    {sections.map(s => (
                      <CurriculumSection key={s.id} section={s} classes={classes}
                        onSelectClass={setSelectedClass} selectedClassId={selectedClass?.id}
                        isEnrolled={isEnrolled} isOwner={isOwner} />
                    ))}
                    {/* Unsectioned classes */}
                    {classes.filter(c => !c.section).length > 0 && (
                      <CurriculumSection section={null}
                        classes={classes.filter(c => !c.section)}
                        onSelectClass={setSelectedClass} selectedClassId={selectedClass?.id}
                        isEnrolled={isEnrolled} isOwner={isOwner} />
                    )}
                  </div>
                ) : (
                  // Flat list (no sections)
                  <CurriculumSection section={null} classes={classes}
                    onSelectClass={setSelectedClass} selectedClassId={selectedClass?.id}
                    isEnrolled={isEnrolled} isOwner={isOwner} />
                )}
              </section>

              {/* Reviews */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Student Reviews</h2>
                  {!isOwner && isAuthenticated && (
                    <button onClick={() => setShowReport(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
                      <Flag className="h-3.5 w-3.5" />Report course
                    </button>
                  )}
                </div>

                {canReview && (
                  <div className="bg-white rounded-2xl border p-5 mb-5">
                    {myReviewData && !reviewEditMode ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm">Your Review</h3>
                          <button onClick={() => setReviewEditMode(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <Pencil className="h-3 w-3" />Edit
                          </button>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {[1,2,3,4,5].map(s => <Star key={s} className={cn('h-4 w-4', s <= myReviewData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />)}
                        </div>
                        {myReviewData.title && <p className="font-medium text-sm mb-1">{myReviewData.title}</p>}
                        <p className="text-sm text-muted-foreground italic">"{myReviewData.comment}"</p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-sm mb-4">{myReviewData ? 'Edit Your Review' : 'Leave a Review'}</h3>
                        <ReviewForm courseId={Number(id)} existingReview={reviewEditMode ? myReviewData : null}
                          onSuccess={() => setReviewEditMode(false)} />
                        {reviewEditMode && <button onClick={() => setReviewEditMode(false)} className="mt-3 text-xs text-muted-foreground hover:text-primary">Cancel</button>}
                      </>
                    )}
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 text-sm text-indigo-700">
                    <Link to="/login" className="font-semibold underline">Sign in</Link> and enroll to leave a review.
                  </div>
                )}

                {reviews.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-muted-foreground">No reviews yet. Be the first!</div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="bg-white rounded-xl border p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(review.reviewer_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-medium text-sm">{review.reviewer_name}</span>
                              <div className="flex gap-0.5">
                                {Array.from({length:5}).map((_,j) => <Star key={j} className={cn('h-3.5 w-3.5', j<review.rating?'fill-amber-400 text-amber-400':'text-slate-200')} />)}
                              </div>
                            </div>
                            {review.title && <p className="font-medium text-sm mt-1.5">{review.title}</p>}
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <aside className="lg:w-80 shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl border shadow-sm overflow-hidden">
                {/* Trailer or cover */}
                {course.trailer_url ? (
                  <div className="aspect-video bg-black flex items-center justify-center relative">
                    <iframe src={course.trailer_url.replace('watch?v=','embed/')}
                      className="w-full h-full" allowFullScreen title="Course trailer" />
                  </div>
                ) : course.cover_image ? (
                  <img src={course.cover_image} alt={course.title} className="w-full aspect-video object-cover" />
                ) : (
                  <div className="aspect-video flex items-center justify-center gradient-brand">
                    <span className="text-5xl font-bold text-white/20">{course.title?.[0]}</span>
                  </div>
                )}

                <div className="p-5">
                  <div className="text-3xl font-bold mb-1">
                    {course.is_free
                      ? <span className="text-emerald-600">Free</span>
                      : course.price_amd
                        ? <span>{Number(course.price_amd).toLocaleString()} ֏</span>
                        : <span>Paid</span>
                    }
                  </div>
                  {!course.is_free && course.price_amd && (
                    <p className="text-xs text-muted-foreground mb-3">Armenian Dram (AMD)</p>
                  )}

                  {isEnrolled || paymentResult === 'success' ? (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-medium rounded-xl px-4 py-3 mb-4 border border-emerald-200">
                      <Check className="h-5 w-5" />Enrolled!
                    </div>
                  ) : !isOwner && (
                    <Button className="w-full h-11 text-base font-semibold mb-4" onClick={handleEnroll}
                      disabled={enrollMutation.isPending || paymentLoading}>
                      {(enrollMutation.isPending || paymentLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                      {!isAuthenticated
                        ? 'Sign in to Enroll'
                        : !course.is_free && course.price_amd
                          ? `Pay ${Number(course.price_amd).toLocaleString()} ֏ & Enroll`
                          : 'Enroll Now — Free'}
                    </Button>
                  )}

                  <Separator className="my-4" />

                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-primary" />{classes.length} lecture{classes.length !== 1 ? 's' : ''}</li>
                    <li className="flex items-center gap-2.5"><Users className="h-4 w-4 text-primary" />{course.total_students || 0} enrolled</li>
                    <li className="flex items-center gap-2.5"><Award className="h-4 w-4 text-primary" />Certificate on completion</li>
                    {course.language && <li className="flex items-center gap-2.5"><BookOpen className="h-4 w-4 text-primary" />Taught in {course.language}</li>}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />

      {showReport && (
        <ReportModal courseId={Number(id)} onClose={() => setShowReport(false)} />
      )}
    </div>
  )

  return course.content_rating === 'adult' ? <AgeGate>{content}</AgeGate> : content
}
