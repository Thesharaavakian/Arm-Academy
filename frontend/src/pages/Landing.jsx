import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, Play, Users, BookOpen, Award, Star, Check, ChevronRight,
  Video, Sparkles, GraduationCap, TrendingUp, MessageSquare, Loader2,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion } from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import CourseCard from '@/components/courses/CourseCard'
import { useCountUp, useInView } from '@/hooks/useInView'
import { cn } from '@/lib/utils'
import { coursesApi } from '@/api/courses'
import { usersApi } from '@/api/users'

// ─── FAQ data (static — content, not user data) ──────────────────────────────
const FAQ_ITEMS = [
  { question: 'Is Arm Academy free to use?',
    answer: 'Signing up is completely free. Many courses are also free. Premium courses are offered at affordable rates set by individual tutors.' },
  { question: 'What language are courses taught in?',
    answer: 'All courses are taught in Armenian (Eastern or Western dialect depending on the tutor). Arm Academy is built specifically for the Armenian-speaking community.' },
  { question: 'How do live classes work?',
    answer: 'Live classes happen via a video meeting link provided by the tutor. You\'ll receive a notification before class starts. Recordings are made available to enrolled students.' },
  { question: 'Can I earn a certificate?',
    answer: 'Yes! Upon completing a course you\'ll receive a verified digital certificate with a unique ID that you can download, share, and verify online.' },
  { question: 'How do I become a tutor?',
    answer: 'Register with the "Teach" role, complete your profile, verify your email, and create your first course. Our team reviews tutor profiles to ensure quality.' },
  { question: 'What devices can I use?',
    answer: 'Arm Academy works on any modern browser — desktop, tablet, or mobile. Live classes require a stable internet connection and optionally a webcam.' },
]

const FEATURES = [
  { icon: Video,        title: 'Live Interactive Classes',  color: 'from-indigo-500 to-blue-600',   description: 'Join real-time sessions with expert tutors. Ask questions live and learn collaboratively.' },
  { icon: BookOpen,     title: 'On-Demand Recordings',      color: 'from-violet-500 to-purple-600', description: 'Every live class is recorded. Watch at your own pace and revisit concepts anytime.' },
  { icon: Users,        title: 'Study Groups',              color: 'from-amber-500 to-orange-600',  description: 'Join community groups, find peers at your level, and grow together.' },
  { icon: Award,        title: 'Verified Certificates',     color: 'from-emerald-500 to-teal-600',  description: 'Complete courses and earn verifiable certificates you can share with employers.' },
]

const CATEGORIES = [
  { name: 'Mathematics',       icon: '∑',  color: 'from-blue-500 to-indigo-600',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  { name: 'Physics',           icon: '⚛',  color: 'from-purple-500 to-violet-600',  bg: 'bg-purple-50',  text: 'text-purple-700' },
  { name: 'Armenian Language', icon: 'Ա',  color: 'from-red-500 to-rose-600',       bg: 'bg-red-50',     text: 'text-red-700' },
  { name: 'Computer Science',  icon: '⌨',  color: 'from-slate-600 to-slate-800',    bg: 'bg-slate-100',  text: 'text-slate-700' },
  { name: 'Chemistry',         icon: '🧪', color: 'from-green-500 to-emerald-600',  bg: 'bg-green-50',   text: 'text-green-700' },
  { name: 'History',           icon: '📜', color: 'from-amber-500 to-yellow-600',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  { name: 'English',           icon: '🌐', color: 'from-sky-500 to-cyan-600',       bg: 'bg-sky-50',     text: 'text-sky-700' },
  { name: 'Art & Music',       icon: '🎨', color: 'from-pink-500 to-fuchsia-600',   bg: 'bg-pink-50',    text: 'text-pink-700' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '' }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={cn('transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6', className)}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function StatBubble({ value, suffix = '', label, delay = 0, loading }) {
  const { count, ref } = useCountUp(loading ? 0 : value)
  const { ref: viewRef, inView } = useInView()
  return (
    <div ref={(el) => { ref.current = el; viewRef.current = el }}
      className={cn('text-center transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}
      style={{ transitionDelay: `${delay}ms` }}>
      {loading ? (
        <><Skeleton className="h-12 w-24 mx-auto mb-2" /><Skeleton className="h-4 w-16 mx-auto" /></>
      ) : (
        <>
          <div className="text-4xl md:text-5xl font-bold gradient-text mb-1">{count.toLocaleString()}{suffix}</div>
          <div className="text-slate-500 text-sm font-medium">{label}</div>
        </>
      )}
    </div>
  )
}

function TutorCard({ tutor, delay = 0 }) {
  const { ref, inView } = useInView()
  const name = tutor.display_name || tutor.username
  const photoUrl = tutor.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=128`
  return (
    <div ref={ref} className={cn('card-base p-6 flex flex-col items-center text-center transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className="relative mb-4">
        <img src={photoUrl} alt={name} className="h-20 w-20 rounded-2xl object-cover shadow-md" />
        {tutor.is_verified && (
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs shadow">✓</span>
        )}
      </div>
      <h3 className="font-bold text-base mb-0.5">{name}</h3>
      <p className="text-primary text-sm font-medium mb-3 capitalize">{tutor.role}</p>
      <div className="flex items-center gap-1 mb-3">
        {[1,2,3,4,5].map((s) => <Star key={s} className={cn('h-3.5 w-3.5', s <= Math.round(tutor.average_rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />)}
        <span className="text-xs text-muted-foreground ml-1">{Number(tutor.average_rating || 0).toFixed(1)}</span>
      </div>
      {tutor.expertise_areas && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {tutor.expertise_areas.split(',').slice(0, 3).map((t) => (
            <span key={t} className="text-xs bg-primary/8 text-primary font-medium px-2.5 py-1 rounded-full">{t.trim()}</span>
          ))}
        </div>
      )}
      <div className="flex gap-4 text-xs text-muted-foreground w-full justify-center pt-3 border-t border-slate-100">
        <div><span className="font-bold text-slate-800">{(tutor.total_students || 0).toLocaleString()}</span> students</div>
      </div>
    </div>
  )
}

function ReviewCard({ review, delay = 0 }) {
  const { ref, inView } = useInView()
  const name = review.reviewer_name || 'Student'
  const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e0e7ff&color=4f46e5&size=64`
  return (
    <div ref={ref} className={cn('card-base p-6 flex flex-col h-full transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: review.rating }).map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
      </div>
      {review.title && <h4 className="font-semibold text-sm mb-2">{review.title}</h4>}
      <p className="text-slate-700 leading-relaxed text-sm flex-1 mb-5 italic">"{review.comment}"</p>
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <img src={photoUrl} alt={name} className="h-10 w-10 rounded-full object-cover" />
        <div>
          <div className="font-semibold text-sm">{name}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['site-stats'],
    queryFn: () => usersApi.siteStats().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: featuredCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: () => coursesApi.featured().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.results || [])
    }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: featuredTutors = [], isLoading: tutorsLoading } = useQuery({
    queryKey: ['featured-tutors'],
    queryFn: () => usersApi.featuredTutors().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : (d?.results || [])
    }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: recentReviewsData } = useQuery({
    queryKey: ['recent-reviews'],
    queryFn: () => import('@/api/client').then(m => m.default.get('/reviews/?ordering=-created_at&limit=3')).then(r => {
      const d = r.data; return Array.isArray(d) ? d : (d?.results || [])
    }),
    staleTime: 5 * 60 * 1000,
  })
  const recentReviews = (recentReviewsData || []).slice(0, 3)

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center gradient-brand overflow-hidden">
        <div className="absolute inset-0 pattern-dots pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-3xl" />

        <div className="container relative z-10 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-2 text-white/90 text-sm mb-6 border border-white/20">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live classes happening now
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-6 text-balance">
              Learn from<br />Armenia's{' '}
              <span className="text-amber-300 relative">
                Best
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 10 Q100 2 198 10" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" fill="none"/>
                </svg>
              </span>
              <br />Educators
            </h1>

            <p className="text-lg md:text-xl text-indigo-100 mb-8 max-w-xl leading-relaxed">
              Join thousands of students in live and recorded courses across
              mathematics, sciences, languages, and more — all taught in Armenian.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Button size="xl" variant="white" className="group shadow-lg" asChild>
                <Link to="/register">Start Learning Free <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></Link>
              </Button>
              <Button size="xl" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent" asChild>
                <Link to="/courses"><Play className="h-4 w-4 mr-2" /> Browse Courses</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              {[
                { icon: Check, text: 'Free to sign up' },
                { icon: Check, text: 'No credit card required' },
                { icon: Check, text: 'Cancel anytime' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-sm text-indigo-200">
                  <Icon className="h-4 w-4 text-amber-300" /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ──────────────────────────────────────────────────────── */}
      <section className="border-y bg-slate-50 py-6">
        <div className="container">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Trusted by students from</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {['Yerevan State University', 'NPUA', 'AUA', 'RAU', 'Synopsys Armenia', 'UITE'].map((n) => (
              <span key={n} className="text-slate-400 font-semibold text-sm">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS (real from API) ─────────────────────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <StatBubble value={stats?.total_courses || 0}  suffix="+" label="Courses Available"    delay={0}   loading={statsLoading} />
            <StatBubble value={stats?.total_students || 0} suffix="+" label="Active Students"      delay={100} loading={statsLoading} />
            <StatBubble value={stats?.total_tutors || 0}   suffix="+" label="Expert Tutors"        delay={200} loading={statsLoading} />
            <StatBubble value={stats?.total_reviews || 0}  suffix="+" label="Student Reviews"      delay={300} loading={statsLoading} />
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="section-padding bg-slate-50">
        <div className="container">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">Why Arm Academy</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to learn effectively</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">A complete learning platform built for Armenian-speaking students and educators.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color }, i) => (
              <Reveal key={title} delay={i * 100}>
                <div className="card-base p-6 h-full">
                  <div className={cn('inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br mb-5 shadow-sm', color)}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="container">
          <Reveal>
            <div className="flex items-end justify-between mb-10">
              <div>
                <Badge variant="outline" className="mb-3 text-primary border-primary/30">Browse by Topic</Badge>
                <h2 className="text-3xl md:text-4xl font-bold">Find your subject</h2>
              </div>
              <Button variant="ghost" asChild className="hidden md:flex">
                <Link to="/courses">All courses <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {CATEGORIES.map(({ name, icon, color, bg, text }, i) => (
              <Reveal key={name} delay={i * 60}>
                <Link to={`/courses?category=${encodeURIComponent(name)}`} className="group card-base overflow-hidden">
                  <div className={cn('h-2 w-full bg-gradient-to-r', color)} />
                  <div className="p-5">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl text-2xl mb-3 font-bold', bg, text)}>{icon}</div>
                    <div className="font-bold text-sm mb-0.5 group-hover:text-primary transition-colors">{name}</div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED COURSES (real from API) ─────────────────────────────── */}
      <section className="section-padding bg-slate-50">
        <div className="container">
          <Reveal>
            <div className="flex items-end justify-between mb-10">
              <div>
                <Badge variant="outline" className="mb-3 text-primary border-primary/30">Top Picks</Badge>
                <h2 className="text-3xl md:text-4xl font-bold">Featured Courses</h2>
              </div>
              <Button variant="ghost" asChild className="hidden md:flex">
                <Link to="/courses">View all <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </Reveal>

          {coursesLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
            </div>
          ) : featuredCourses.length === 0 ? (
            <div className="text-center py-16 card-base border-dashed">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No courses yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Be the first to create a course on Arm Academy!</p>
              <Button asChild><Link to="/register?role=tutor">Start Teaching</Link></Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.slice(0, 3).map((course, i) => (
                <Reveal key={course.id} delay={i * 100}>
                  <CourseCard course={course} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="container">
          <Reveal>
            <div className="text-center max-w-xl mx-auto mb-14">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">Simple Process</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Get started in 3 steps</h2>
              <p className="text-muted-foreground">No credit card, no commitment — just sign up and start learning.</p>
            </div>
          </Reveal>
          <div className="relative grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-indigo-200 via-primary to-indigo-200" />
            {[
              { n: '01', icon: GraduationCap, title: 'Create your account', desc: 'Sign up free as a student or tutor. Verify your email and you\'re in.', color: 'from-indigo-500 to-blue-600' },
              { n: '02', icon: BookOpen,      title: 'Browse & enroll',      desc: 'Find courses across dozens of subjects. Filter by level, category, or tutor.', color: 'from-violet-500 to-purple-600' },
              { n: '03', icon: Award,         title: 'Learn & earn',         desc: 'Attend live classes, watch recordings, and earn verified certificates.', color: 'from-amber-500 to-orange-600' },
            ].map(({ n, icon: Icon, title, desc, color }, i) => (
              <Reveal key={n} delay={i * 150}>
                <div className="text-center relative">
                  <div className={cn('inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg mb-6 relative', color)}>
                    <Icon className="h-9 w-9" />
                    <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm">{n}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TUTOR SPOTLIGHT (real from API) ──────────────────────────────── */}
      <section className="section-padding bg-slate-50">
        <div className="container">
          <Reveal>
            <div className="flex items-end justify-between mb-10">
              <div>
                <Badge variant="outline" className="mb-3 text-primary border-primary/30">Expert Instructors</Badge>
                <h2 className="text-3xl md:text-4xl font-bold">Meet your tutors</h2>
              </div>
              <Button variant="ghost" asChild className="hidden md:flex">
                <Link to="/tutors">All tutors <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </Reveal>

          {tutorsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : featuredTutors.length === 0 ? (
            <div className="text-center py-16 card-base border-dashed">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No tutors yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Be the first to register as a tutor!</p>
              <Button asChild><Link to="/register?role=tutor">Become a Tutor</Link></Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredTutors.slice(0, 4).map((tutor, i) => (
                <TutorCard key={tutor.id} tutor={tutor} delay={i * 100} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── STUDENT REVIEWS (real from API) ──────────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="container">
          <Reveal>
            <div className="text-center max-w-xl mx-auto mb-14">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">Student Stories</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What our students say</h2>
              <p className="text-muted-foreground">Real reviews from real students. We never fake them.</p>
            </div>
          </Reveal>

          {recentReviews.length === 0 ? (
            <div className="text-center py-16 card-base border-dashed max-w-lg mx-auto">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No reviews yet</h3>
              <p className="text-muted-foreground text-sm">Enroll in a course and be the first to leave a review!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {recentReviews.map((review, i) => (
                <ReviewCard key={review.id} review={review} delay={i * 120} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="section-padding bg-slate-50">
        <div className="container max-w-3xl">
          <Reveal>
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">FAQ</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently asked questions</h2>
            </div>
          </Reveal>
          <Reveal delay={100}><Accordion items={FAQ_ITEMS} /></Reveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative section-padding gradient-brand overflow-hidden">
        <div className="absolute inset-0 pattern-dots pointer-events-none" />
        <div className="container relative z-10 text-center max-w-3xl">
          <Sparkles className="h-12 w-12 text-amber-300 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 text-balance">Ready to start your learning journey?</h2>
          <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">Join Armenian learners already growing their knowledge on Arm Academy. Free to sign up — always.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" variant="white" className="group shadow-lg shadow-black/20" asChild>
              <Link to="/register">Create Free Account <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></Link>
            </Button>
            <Button size="xl" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent" asChild>
              <Link to="/tutors">Browse Tutors</Link>
            </Button>
          </div>
          <p className="mt-6 text-indigo-300 text-sm">No credit card required · Cancel anytime · Free courses available</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
