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
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { progressApi, certificatesApi } from '@/api/users'
import { coursesApi } from '@/api/courses'
import { cn, formatDate, getInitials } from '@/lib/utils'

// ── Shared ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, trend }) {
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
            {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
          </div>
          {trend && (
            <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
              {trend}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Activity feed item ────────────────────────────────────────────────────────
const MOCK_ACTIVITY = [
  { id: 1, icon: BookOpen, iconBg: 'bg-indigo-100 text-indigo-600', text: 'You enrolled in Advanced Calculus', time: '2 hours ago' },
  { id: 2, icon: CheckCircle2, iconBg: 'bg-emerald-100 text-emerald-600', text: 'Completed "Introduction to Algebra" lesson', time: '1 day ago' },
  { id: 3, icon: Award, iconBg: 'bg-amber-100 text-amber-600', text: 'Certificate earned: Armenian Language B1', time: '3 days ago' },
  { id: 4, icon: MessageSquare, iconBg: 'bg-violet-100 text-violet-600', text: 'New message from Dr. Khachatryan', time: '4 days ago' },
]

const MOCK_UPCOMING = [
  { id: 1, title: 'Calculus: Derivatives Deep Dive', tutor: 'Dr. Aram Khachatryan', date: 'Today, 18:00', type: 'live', color: 'bg-red-500' },
  { id: 2, title: 'Armenian Grammar Workshop', tutor: 'Nune Hovhannisyan', date: 'Tomorrow, 15:00', type: 'live', color: 'bg-indigo-500' },
  { id: 3, title: 'Physics: Wave Mechanics', tutor: 'Prof. Tigran Petrosyan', date: 'Thu, 17:30', type: 'recorded', color: 'bg-purple-500' },
]

// ── Student Dashboard ─────────────────────────────────────────────────────────
function StudentDashboard({ user }) {
  const { data: progressData, isLoading } = useQuery({
    queryKey: ['progress'],
    queryFn: () => progressApi.list().then((r) => r.data),
  })
  const { data: certsData } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesApi.list().then((r) => r.data),
  })

  const progress = progressData?.results || progressData || []
  const certs = certsData?.results || certsData || []
  const completed = progress.filter((p) => p.is_completed).length
  const inProgress = progress.filter((p) => !p.is_completed).length
  const avgProgress = progress.length
    ? Math.round(progress.reduce((s, p) => s + (p.completion_percentage || 0), 0) / progress.length)
    : 0

  const firstName = user?.first_name || user?.username?.split('.')[0] || 'there'

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your learning today.</p>
        </div>
        <Button asChild>
          <Link to="/courses"><BookOpen className="h-4 w-4 mr-2" /> Find Courses</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Enrolled" value={progress.length} color="bg-indigo-100 text-indigo-600" trend="+2 this month" />
        <StatCard icon={TrendingUp} label="In Progress" value={inProgress} color="bg-violet-100 text-violet-600" />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Award} label="Certificates" value={certs.length} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Overall progress bar */}
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
        {/* In-progress courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Continue Learning</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/courses">All courses <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : inProgress === 0 ? (
            <div className="card-base p-8 text-center border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No courses yet</p>
              <p className="text-sm text-muted-foreground mb-4">Start your learning journey today!</p>
              <Button asChild size="sm"><Link to="/courses">Browse Courses</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              {progress.filter((p) => !p.is_completed).map((p) => (
                <Card key={p.id} className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-2 truncate">{p.course_title}</div>
                      <div className="flex items-center gap-3">
                        <Progress value={p.completion_percentage} className="flex-1 h-2" />
                        <span className="text-xs font-semibold text-primary shrink-0">
                          {Math.round(p.completion_percentage || 0)}%
                        </span>
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

        {/* Sidebar: upcoming + activity */}
        <div className="space-y-4">
          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Upcoming Classes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {MOCK_UPCOMING.map((cls) => (
                  <div key={cls.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={cn('mt-0.5 h-2.5 w-2.5 rounded-full shrink-0', cls.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">{cls.title}</div>
                      <div className="text-xs text-muted-foreground">{cls.tutor}</div>
                      <div className="text-xs font-medium text-primary mt-0.5">{cls.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {MOCK_ACTIVITY.map(({ id, icon: Icon, iconBg, text, time }) => (
                  <div key={id} className="flex items-start gap-3 px-4 py-3">
                    <div className={cn('mt-0.5 flex h-7 w-7 items-center justify-center rounded-full shrink-0', iconBg)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs leading-snug">{text}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Certificates */}
      {certs.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">Your Certificates</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {certs.map((cert) => (
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

// ── Tutor Dashboard ───────────────────────────────────────────────────────────
const MOCK_REVIEWS = [
  { id: 1, student: 'Hayk M.', photo: 'https://i.pravatar.cc/32?img=11', rating: 5, text: 'Excellent teaching style!', course: 'Advanced Calculus', date: '2 days ago' },
  { id: 2, student: 'Lili S.', photo: 'https://i.pravatar.cc/32?img=48', rating: 5, text: 'Very clear explanations.', course: 'Linear Algebra', date: '5 days ago' },
]

function TutorDashboard({ user }) {
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['my-courses', user?.id],
    queryFn: () => coursesApi.myCourses().then((r) => r.data),
    enabled: !!user?.id,
  })

  const courses = coursesData?.results || coursesData || []
  const totalStudents = courses.reduce((s, c) => s + (c.total_students || 0), 0)
  const totalReviews = courses.reduce((s, c) => s + (c.total_reviews || 0), 0)
  const avgRating = courses.length
    ? (courses.reduce((s, c) => s + parseFloat(c.average_rating || 0), 0) / courses.length).toFixed(1)
    : '—'

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tutor Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your courses and track student engagement.</p>
        </div>
        <Button asChild>
          <Link to="/courses/new"><Plus className="h-4 w-4 mr-2" /> Create Course</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Courses" value={courses.length} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={Users} label="Total Students" value={totalStudents.toLocaleString()} color="bg-violet-100 text-violet-600" trend="+12 this week" />
        <StatCard icon={Star} label="Avg Rating" value={avgRating} color="bg-amber-100 text-amber-600" />
        <StatCard icon={MessageSquare} label="Reviews" value={totalReviews} color="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">My Courses</h2>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="card-base p-8 text-center border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No courses yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first course and start teaching.</p>
              <Button asChild size="sm"><Link to="/courses/new">Create Course</Link></Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          )}
        </div>

        {/* Recent reviews */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" /> Recent Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {MOCK_REVIEWS.map((r) => (
                  <div key={r.id} className="px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={r.photo} alt="" className="h-7 w-7 rounded-full" />
                      <span className="text-sm font-medium">{r.student}</span>
                      <div className="flex gap-0.5 ml-auto">
                        {Array.from({ length: r.rating }).map((_, j) => (
                          <Star key={j} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground italic mb-1">"{r.text}"</p>
                    <div className="text-xs text-primary font-medium">{r.course}</div>
                    <div className="text-xs text-muted-foreground">{r.date}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart className="h-4 w-4 text-primary" /> Student Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { m: 'Jan', v: 60 }, { m: 'Feb', v: 75 }, { m: 'Mar', v: 55 },
                  { m: 'Apr', v: 90 }, { m: 'May', v: 100 },
                ].map(({ m, v }) => (
                  <div key={m} className="flex items-center gap-3 text-xs">
                    <span className="w-8 text-muted-foreground">{m}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full gradient-brand rounded-full transition-all" style={{ width: `${v}%` }} />
                    </div>
                    <span className="w-6 text-right font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore()
  const isTutor = user?.role === 'tutor' || user?.role === 'teacher'

  return (
    <DashboardLayout>
      {isTutor ? <TutorDashboard user={user} /> : <StudentDashboard user={user} />}
    </DashboardLayout>
  )
}
