import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BookOpen, Award, TrendingUp, ArrowRight, Plus, Users, Clock,
  Star, Calendar, MessageSquare, Bell, BarChart, CheckCircle2,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CourseCard from '@/components/courses/CourseCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { progressApi, certificatesApi, usersApi } from '@/api/users'
import { coursesApi, classesApi } from '@/api/courses'
import { cn, formatDate, formatDateTime, getInitials } from '@/lib/utils'
import api from '@/api/client'

function StatCard({ icon: Icon, label, value, color, trend }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-5">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shrink-0', color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
          {trend && (
            <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">{trend}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Student Dashboard ──────────────────────────────────────────────────────────
function StudentDashboard({ user }) {
  const { data: progressData, isLoading } = useQuery({
    queryKey: ['progress'],
    queryFn: () => progressApi.list().then(r => r.data),
  })
  const { data: certsData } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesApi.list().then(r => r.data),
  })
  const { data: upcomingRaw } = useQuery({
    queryKey: ['my-upcoming-classes'],
    queryFn: () => api.get('/classes/my_upcoming/').then(r => r.data),
  })

  const progress  = progressData?.results  || progressData  || []
  const certs     = certsData?.results     || certsData     || []
  const upcoming  = Array.isArray(upcomingRaw) ? upcomingRaw : (upcomingRaw?.results || [])
  const completed = progress.filter(p => p.is_completed).length
  const inProgress = progress.filter(p => !p.is_completed).length
  const avgProgress = progress.length
    ? Math.round(progress.reduce((s, p) => s + (p.completion_percentage || 0), 0) / progress.length)
    : 0

  const firstName = user?.first_name || user?.username?.split('.')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Build activity from real data
  const activity = [
    ...certs.slice(0, 2).map(c => ({
      id: `cert-${c.id}`, icon: Award, iconBg: 'bg-amber-100 text-amber-600',
      text: `Certificate earned: ${c.course_title}`, time: formatDate(c.issue_date),
    })),
    ...progress.filter(p => p.is_completed).slice(0, 2).map(p => ({
      id: `comp-${p.id}`, icon: CheckCircle2, iconBg: 'bg-emerald-100 text-emerald-600',
      text: `Completed: ${p.course_title}`, time: formatDate(p.completed_at),
    })),
    ...progress.slice(0, 3).map(p => ({
      id: `enrol-${p.id}`, icon: BookOpen, iconBg: 'bg-indigo-100 text-indigo-600',
      text: `Enrolled in ${p.course_title}`, time: formatDate(p.started_at),
    })),
  ].slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{greeting}, {firstName}! 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your learning today.</p>
        </div>
        <Button asChild>
          <Link to="/courses"><BookOpen className="h-4 w-4 mr-2" />Find Courses</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}    label="Enrolled"     value={progress.length} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={TrendingUp}  label="In Progress"  value={inProgress}      color="bg-violet-100 text-violet-600" />
        <StatCard icon={CheckCircle2} label="Completed"   value={completed}       color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Award}       label="Certificates" value={certs.length}    color="bg-amber-100 text-amber-600" />
      </div>

      {progress.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">Overall Progress</div>
                <div className="text-sm text-muted-foreground">Across all enrolled courses</div>
              </div>
              <span className="text-2xl font-bold gradient-text">{avgProgress}%</span>
            </div>
            <Progress value={avgProgress} className="h-3 rounded-full" />
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Continue Learning</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/courses">All courses <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : inProgress === 0 ? (
            <div className="card-base p-8 text-center border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No courses in progress</p>
              <p className="text-sm text-muted-foreground mb-4">Enroll in a course to start learning!</p>
              <Button asChild size="sm"><Link to="/courses">Browse Courses</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              {progress.filter(p => !p.is_completed).map(p => (
                <Card key={p.id} className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-2 truncate">{p.course_title}</div>
                      <div className="flex items-center gap-3">
                        <Progress value={p.completion_percentage || 0} className="flex-1 h-2" />
                        <span className="text-xs font-semibold text-primary shrink-0">{Math.round(p.completion_percentage || 0)}%</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="shrink-0">
                      <Link to={`/courses/${p.course}`}>Continue</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Real upcoming classes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Upcoming Classes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-4">No scheduled classes yet.</p>
              ) : (
                <div className="divide-y">
                  {upcoming.map(cls => (
                    <div key={cls.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-1">{cls.title}</div>
                        <div className="text-xs text-muted-foreground">{cls.course_title}</div>
                        {cls.scheduled_start && (
                          <div className="text-xs font-medium text-primary mt-0.5">{formatDateTime(cls.scheduled_start)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real activity derived from data */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-4">No recent activity.</p>
              ) : (
                <div className="divide-y">
                  {activity.map(({ id, icon: Icon, iconBg, text, time }) => (
                    <div key={id} className="flex items-start gap-3 px-4 py-3">
                      <div className={cn('mt-0.5 flex h-7 w-7 items-center justify-center rounded-full shrink-0', iconBg)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs leading-snug">{text}</div>
                        {time && <div className="text-xs text-muted-foreground mt-0.5">{time}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {certs.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">Your Certificates</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {certs.map(cert => (
              <div key={cert.id} className="card-base p-5 flex items-start gap-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0 text-2xl">🏅</div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{cert.course_title}</div>
                  <div className="text-xs text-amber-700 mt-1">Issued {formatDate(cert.issue_date)}</div>
                  <div className="text-xs font-mono text-amber-600 mt-0.5 truncate">#{cert.certificate_number}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Tutor Dashboard ────────────────────────────────────────────────────────────
function TutorDashboard({ user }) {
  const { data: coursesRaw, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => coursesApi.myCourses().then(r => r.data),
    enabled: !!user?.id,
  })
  const { data: reviewsRaw } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get('/users/my_reviews/').then(r => r.data),
  })

  const courses   = coursesRaw?.results || coursesRaw || []
  const reviews   = Array.isArray(reviewsRaw) ? reviewsRaw : (reviewsRaw?.results || [])
  const totalStudents = courses.reduce((s, c) => s + (c.total_students || 0), 0)
  const totalReviews  = courses.reduce((s, c) => s + (c.total_reviews  || 0), 0)
  const avgRating = courses.length
    ? (courses.reduce((s, c) => s + parseFloat(c.average_rating || 0), 0) / courses.length).toFixed(1)
    : '—'

  // Real student growth: students per course as relative bar
  const maxStudents = Math.max(1, ...courses.map(c => c.total_students || 0))

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tutor Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your courses and track student engagement.</p>
        </div>
        <Button asChild>
          <Link to="/create-course"><Plus className="h-4 w-4 mr-2" />Create Course</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}     label="Total Courses"   value={courses.length}                color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={Users}        label="Total Students"  value={totalStudents.toLocaleString()} color="bg-violet-100 text-violet-600" />
        <StatCard icon={Star}         label="Avg Rating"      value={avgRating}                     color="bg-amber-100 text-amber-600" />
        <StatCard icon={MessageSquare} label="Reviews"        value={totalReviews}                  color="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">My Courses</h2>
          </div>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">{[1,2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : courses.length === 0 ? (
            <div className="card-base p-8 text-center border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No courses yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first course and start teaching.</p>
              <Button asChild size="sm"><Link to="/create-course">Create Course</Link></Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {courses.slice(0, 4).map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Real reviews */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" /> Recent Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-4">No reviews yet.</p>
              ) : (
                <div className="divide-y">
                  {reviews.slice(0, 4).map(r => (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {getInitials(r.reviewer_name)}
                        </div>
                        <span className="text-sm font-medium truncate">{r.reviewer_name}</span>
                        <div className="flex gap-0.5 ml-auto">
                          {Array.from({ length: r.rating }).map((_, j) => (
                            <Star key={j} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic line-clamp-2">"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student distribution per course */}
          {courses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-primary" /> Students by Course
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {courses.slice(0, 5).map(c => {
                    const pct = maxStudents > 0 ? Math.round((c.total_students || 0) / maxStudents * 100) : 0
                    return (
                      <div key={c.id} className="flex items-center gap-3 text-xs">
                        <span className="w-24 text-muted-foreground truncate">{c.title}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full gradient-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right font-medium">{c.total_students || 0}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore()
  const isTutor = ['tutor', 'teacher'].includes(user?.role)
  return (
    <DashboardLayout>
      {isTutor ? <TutorDashboard user={user} /> : <StudentDashboard user={user} />}
    </DashboardLayout>
  )
}
