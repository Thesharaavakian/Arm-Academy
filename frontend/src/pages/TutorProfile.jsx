import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Star, Users, BookOpen, Award, MessageSquare, ArrowLeft,
  Check, MapPin, Clock, ChevronRight,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CourseCard from '@/components/courses/CourseCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/authStore'
import { getInitials, formatDate, cn } from '@/lib/utils'
import api from '@/api/client'

export default function TutorProfile() {
  const { id }              = useParams()
  const navigate            = useNavigate()
  const { isAuthenticated, user } = useAuthStore()

  const { data: tutor, isLoading: tutorLoading } = useQuery({
    queryKey: ['tutor', id],
    queryFn: () => api.get(`/users/${id}/`).then(r => r.data),
  })

  const { data: coursesData } = useQuery({
    queryKey: ['tutor-courses', id],
    queryFn: () => api.get(`/users/${id}/courses/`).then(r => r.data),
    enabled: !!id,
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['tutor-reviews', id],
    queryFn: () => api.get(`/users/${id}/reviews/`).then(r => r.data),
    enabled: !!id,
  })

  const courses = Array.isArray(coursesData) ? coursesData : (coursesData?.results || [])
  const reviews = Array.isArray(reviewsData) ? reviewsData : (reviewsData?.results || [])

  const handleMessage = () => {
    if (!isAuthenticated) { navigate('/login'); return }
    navigate(`/messages?with=${id}`)
  }

  if (tutorLoading) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="container py-12 space-y-6">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-8 w-1/3" />
          <div className="grid sm:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!tutor || !['tutor', 'teacher'].includes(tutor.role)) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Tutor not found.</p>
          <Button variant="outline" className="mt-4" asChild><Link to="/tutors">Back to Tutors</Link></Button>
        </div>
      </div>
    )
  }

  const name        = tutor.display_name || tutor.username
  const photoUrl    = tutor.profile_picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=200`
  const isSelf      = isAuthenticated && user?.id === tutor.id
  const tags        = tutor.expertise_areas?.split(',').map(t => t.trim()).filter(Boolean) || []

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero banner */}
      <div className="gradient-brand py-14 relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots pointer-events-none" />
        <div className="container relative z-10">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white mb-6 -ml-2" asChild>
            <Link to="/tutors"><ArrowLeft className="h-4 w-4 mr-1.5" />All Tutors</Link>
          </Button>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="relative shrink-0">
              <img src={photoUrl} alt={name}
                className="h-28 w-28 rounded-2xl object-cover border-4 border-white/20 shadow-xl" />
              {tutor.is_verified && (
                <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary border-2 border-white shadow text-white text-xs">✓</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold text-white">{name}</h1>
                {tutor.is_verified && <Badge className="bg-white/20 text-white border-white/30">Verified</Badge>}
                <Badge className="bg-white/20 text-white border-white/30 capitalize">{tutor.role}</Badge>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(t => (
                    <span key={t} className="text-xs bg-white/10 text-indigo-100 px-2.5 py-1 rounded-full border border-white/20">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-5 text-sm text-indigo-200">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-white">{Number(tutor.average_rating || 0).toFixed(1)}</span>
                  <span>({tutor.total_reviews || 0} reviews)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{(tutor.total_students || 0).toLocaleString()} students</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  <span>{courses.length} course{courses.length !== 1 ? 's' : ''}</span>
                </div>
                {tutor.hourly_rate && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{Number(tutor.hourly_rate).toLocaleString()} ֏/hr</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {!isSelf && (
              <div className="flex gap-3 shrink-0">
                <Button variant="white" onClick={handleMessage}>
                  <MessageSquare className="h-4 w-4 mr-2" />Message
                </Button>
              </div>
            )}
            {isSelf && (
              <Button variant="white" asChild>
                <Link to="/profile">Edit Profile</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container py-10 grid lg:grid-cols-3 gap-8">
        {/* Left — bio + stats */}
        <aside className="space-y-5">
          {/* Bio */}
          {tutor.bio && (
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-bold mb-3">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{tutor.bio}</p>
            </div>
          )}

          {/* Quick stats */}
          <div className="bg-white rounded-2xl border p-5 space-y-4">
            <h3 className="font-bold">Stats</h3>
            {[
              { icon: Star,     label: 'Average Rating',   val: Number(tutor.average_rating || 0).toFixed(1) },
              { icon: Users,    label: 'Total Students',    val: (tutor.total_students || 0).toLocaleString() },
              { icon: BookOpen, label: 'Courses',           val: courses.length },
              { icon: Award,    label: 'Reviews Received',  val: tutor.total_reviews || 0 },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
                <span className="font-semibold">{val}</span>
              </div>
            ))}

            {tutor.created_at && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Teaching on Arm Academy since {formatDate(tutor.created_at)}
                </p>
              </>
            )}
          </div>

          {/* Message CTA */}
          {!isSelf && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-center">
              <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium mb-3">Have a question for {name.split(' ')[0]}?</p>
              <Button className="w-full" onClick={handleMessage}>
                {isAuthenticated ? 'Send a Message' : 'Sign in to Message'}
              </Button>
            </div>
          )}
        </aside>

        {/* Right — courses + reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Courses */}
          <section>
            <h2 className="text-xl font-bold mb-4">
              Courses by {name.split(' ')[0]}
              <span className="text-base font-normal text-muted-foreground ml-2">({courses.length})</span>
            </h2>
            {courses.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-muted-foreground">
                No published courses yet.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {courses.map(c => <CourseCard key={c.id} course={c} />)}
              </div>
            )}
          </section>

          {/* Reviews */}
          <section>
            <h2 className="text-xl font-bold mb-4">
              Student Reviews
              <span className="text-base font-normal text-muted-foreground ml-2">({reviews.length})</span>
            </h2>
            {reviews.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-muted-foreground">
                No reviews yet.
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 10).map(review => (
                  <div key={review.id} className="bg-white rounded-xl border p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {getInitials(review.reviewer_name)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-medium text-sm">{review.reviewer_name}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={cn('h-3.5 w-3.5', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                            ))}
                          </div>
                        </div>
                        {review.title && <p className="font-medium text-sm mt-1">{review.title}</p>}
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
