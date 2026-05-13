import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Star, Users, Clock, Award, ChevronRight, Play, MessageSquare,
  MapPin, Check, Loader2, Pencil, Settings,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import ReviewForm from '@/components/reviews/ReviewForm'
import { coursesApi } from '@/api/courses'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/useToast'
import { formatDateTime, getInitials, cn } from '@/lib/utils'
import api from '@/api/client'

const classTypeIcon = { live: Play, recorded: Play, chat: MessageSquare, in_person: MapPin }
const classTypeBadge = { live: 'destructive', recorded: 'secondary', chat: 'outline', in_person: 'success' }

export default function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [reviewEditMode, setReviewEditMode] = useState(false)

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.get(id).then((r) => r.data),
  })

  const { data: classesRaw } = useQuery({
    queryKey: ['course-classes', id],
    queryFn: () => coursesApi.classes(id).then((r) => r.data),
    enabled: !!id,
  })

  const { data: reviewsRaw } = useQuery({
    queryKey: ['course-reviews', id],
    queryFn: () => coursesApi.reviews(id).then((r) => r.data),
    enabled: !!id,
  })

  // Fetch the current user's review for this course (if any)
  const { data: myReviewData } = useQuery({
    queryKey: ['my-review', id],
    queryFn: () =>
      api.get('/reviews/', { params: { course: id, reviewer: user?.id } })
        .then((r) => {
          const d = r.data
          const arr = Array.isArray(d) ? d : (d?.results || [])
          return arr[0] || null
        }),
    enabled: !!isAuthenticated && !!user?.id,
  })

  const [paymentLoading, setPaymentLoading] = useState(false)

  const enrollMutation = useMutation({
    mutationFn: () => coursesApi.enroll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      toast({ title: 'Enrolled!', description: `You're now enrolled in "${course?.title}".`, variant: 'success' })
    },
    onError: (err) => {
      const d = err.response?.data
      if (d?.requires_payment) {
        // Should not reach here — handleEnroll catches paid courses first
        // but handle gracefully just in case
        handlePayment()
      } else {
        toast({ title: 'Enrollment failed', description: d?.detail || 'Please try again.', variant: 'destructive' })
      }
    },
  })

  const handlePayment = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    setPaymentLoading(true)
    try {
      const { data } = await api.post(`/payments/initiate/${id}/`)
      if (data.checkout_url) {
        window.location.href = data.checkout_url   // → Stripe
      } else if (data.manual) {
        toast({
          title: `Payment required — ${Number(data.amount_amd).toLocaleString()} ֏`,
          description: data.detail,
          variant: 'default',
        })
      }
    } catch (err) {
      toast({ title: 'Payment failed', description: err.response?.data?.detail || 'Please try again.', variant: 'destructive' })
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleEnroll = () => {
    if (!isAuthenticated) { navigate('/login'); return }
    // Route paid courses through payment flow
    if (!course?.is_free && course?.price_amd) {
      handlePayment()
      return
    }
    enrollMutation.mutate()
  }

  const classes = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.results || [])
  const reviews = Array.isArray(reviewsRaw) ? reviewsRaw : (reviewsRaw?.results || [])
  const isOwner = course?.is_owner
  const isEnrolled = course?.is_enrolled || enrollMutation.isSuccess
  const canReview = isAuthenticated && isEnrolled && !isOwner

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-10 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-60 w-full rounded-2xl" />
        </div>
      </div>
    )
  }
  if (!course) return null

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <div className="bg-slate-900 text-white py-12">
        <div className="container">
          <nav className="flex gap-2 items-center text-sm text-slate-400 mb-5">
            <Link to="/courses" className="hover:text-white transition-colors">Courses</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">{course.title}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="info" className="capitalize">{course.level}</Badge>
              {course.is_free && <Badge variant="success">Free</Badge>}
              {course.category && <Badge variant="outline" className="border-white/30 text-white/80">{course.category}</Badge>}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{course.title}</h1>
            <p className="text-slate-300 mb-5 max-w-2xl leading-relaxed">{course.description}</p>

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
            </div>

            <div className="flex items-center gap-3 mt-5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-600 text-white text-xs">{getInitials(course.tutor_name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-slate-300">
                by <span className="text-white font-medium">{course.tutor_name}</span>
              </span>
            </div>

            {/* Owner controls */}
            {isOwner && (
              <div className="mt-5">
                <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent" asChild>
                  <Link to={`/courses/${id}/manage`}><Settings className="h-4 w-4 mr-2" />Manage Course</Link>
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
            {/* Main */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* Curriculum */}
              <section>
                <h2 className="text-xl font-bold mb-4">Course Curriculum</h2>
                {classes.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-muted-foreground">
                    No classes added yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classes.map((cls) => {
                      const Icon = classTypeIcon[cls.class_type] || Play
                      return (
                        <div key={cls.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:border-primary/30 transition-colors">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{cls.title}</div>
                            {cls.scheduled_start && (
                              <div className="text-xs text-muted-foreground mt-0.5">{formatDateTime(cls.scheduled_start)}</div>
                            )}
                          </div>
                          <Badge variant={classTypeBadge[cls.class_type] || 'outline'} className="capitalize shrink-0 text-xs">
                            {cls.class_type?.replace('_', ' ')}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Reviews */}
              <section>
                <h2 className="text-xl font-bold mb-5">Student Reviews</h2>

                {/* Leave / edit a review */}
                {canReview && (
                  <div className="bg-white rounded-2xl border p-5 mb-5">
                    {myReviewData && !reviewEditMode ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm">Your Review</h3>
                          <button onClick={() => setReviewEditMode(true)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={cn('h-4 w-4', s <= myReviewData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                          ))}
                        </div>
                        {myReviewData.title && <p className="font-medium text-sm mb-1">{myReviewData.title}</p>}
                        <p className="text-sm text-muted-foreground italic">"{myReviewData.comment}"</p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-sm mb-4">
                          {myReviewData ? 'Edit Your Review' : 'Leave a Review'}
                        </h3>
                        <ReviewForm
                          courseId={Number(id)}
                          existingReview={reviewEditMode ? myReviewData : null}
                          onSuccess={() => setReviewEditMode(false)}
                        />
                        {reviewEditMode && (
                          <button onClick={() => setReviewEditMode(false)}
                            className="mt-3 text-xs text-muted-foreground hover:text-primary">
                            Cancel
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 text-sm text-indigo-700">
                    <Link to="/login" className="font-semibold underline">Sign in</Link> and enroll to leave a review.
                  </div>
                )}

                {isAuthenticated && !isEnrolled && !isOwner && (
                  <div className="bg-slate-100 rounded-xl p-4 mb-5 text-sm text-muted-foreground">
                    Enroll in this course to leave a review.
                  </div>
                )}

                {reviews.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-muted-foreground">
                    No reviews yet. Be the first to review!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-white rounded-xl border p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(review.reviewer_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-medium text-sm">{review.reviewer_name}</span>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, j) => (
                                  <Star key={j} className={cn('h-3.5 w-3.5', j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                                ))}
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
                <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100">
                  {course.cover_image
                    ? <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center gradient-brand">
                        <span className="text-5xl font-bold text-white/20">{course.title?.[0]}</span>
                      </div>
                  }
                </div>

                <div className="p-5">
                  <div className="text-3xl font-bold mb-1">
                    {course.is_free
                      ? <span className="text-emerald-600">Free</span>
                      : <span>{course.price_amd ? `${Number(course.price_amd).toLocaleString()} ֏` : 'Paid'}</span>
                    }
                  </div>
                  {!course.is_free && course.price_amd && (
                    <p className="text-xs text-muted-foreground mb-4">Armenian Dram (AMD)</p>
                  )}

                  {isEnrolled ? (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-medium rounded-xl px-4 py-3 mb-4 border border-emerald-200">
                      <Check className="h-5 w-5" /> Enrolled!
                    </div>
                  ) : !isOwner && (
                    <Button
                      className="w-full h-11 text-base font-semibold mb-4"
                      onClick={handleEnroll}
                      disabled={enrollMutation.isPending || paymentLoading}
                    >
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
                    <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-primary" />{classes.length} class{classes.length !== 1 ? 'es' : ''}</li>
                    <li className="flex items-center gap-2.5"><Users className="h-4 w-4 text-primary" />{course.total_students || 0} students enrolled</li>
                    <li className="flex items-center gap-2.5"><Award className="h-4 w-4 text-primary" />Certificate on completion</li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
