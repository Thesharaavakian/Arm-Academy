import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Users, BookOpen, Check, Filter } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useInView } from '@/hooks/useInView'
import { cn } from '@/lib/utils'

const ALL_TUTORS = [
  { id: 1, name: 'Dr. Aram Khachatryan', subject: 'Mathematics', tags: ['Calculus', 'Linear Algebra', 'Statistics', 'Differential Equations'],
    rating: 4.9, students: 1842, courses: 12, verified: true, featured: true,
    photo: 'https://i.pravatar.cc/300?img=33',
    bio: 'PhD in Mathematics from Yerevan State University. 15 years of teaching experience. Former assistant professor at NPUA.' },
  { id: 2, name: 'Nune Hovhannisyan', subject: 'Armenian Language', tags: ['Grammar', 'Literature', 'Writing', 'History of Language'],
    rating: 4.8, students: 1205, courses: 8, verified: true, featured: true,
    photo: 'https://i.pravatar.cc/300?img=47',
    bio: 'Philologist and published author. Passionate about preserving and teaching the beauty of the Armenian language.' },
  { id: 3, name: 'Prof. Tigran Petrosyan', subject: 'Physics', tags: ['Mechanics', 'Thermodynamics', 'Quantum Physics', 'Electromagnetism'],
    rating: 4.7, students: 987, courses: 6, verified: true, featured: true,
    photo: 'https://i.pravatar.cc/300?img=68',
    bio: 'Former researcher at the Armenian National Academy of Sciences. Specializes in making complex physics accessible.' },
  { id: 4, name: 'Ani Vardanyan', subject: 'Computer Science', tags: ['Python', 'Web Development', 'Algorithms', 'Data Structures'],
    rating: 4.9, students: 2341, courses: 15, verified: true, featured: true,
    photo: 'https://i.pravatar.cc/300?img=44',
    bio: 'Senior software engineer at a leading Yerevan tech company. Passionate about teaching coding to the next generation.' },
  { id: 5, name: 'Dr. Sona Grigoryan', subject: 'Chemistry', tags: ['Organic Chemistry', 'Biochemistry', 'Lab Techniques'],
    rating: 4.6, students: 654, courses: 5, verified: true, featured: false,
    photo: 'https://i.pravatar.cc/300?img=49',
    bio: 'PhD in Chemistry from YSU. Expert in making chemistry approachable for students at all levels.' },
  { id: 6, name: 'Artak Muradyan', subject: 'History', tags: ['Armenian History', 'Ancient Civilizations', 'Medieval Studies'],
    rating: 4.8, students: 891, courses: 9, verified: true, featured: false,
    photo: 'https://i.pravatar.cc/300?img=12',
    bio: 'Historian and lecturer. 12 years of experience making Armenian and world history vivid and relevant.' },
  { id: 7, name: 'Maria Abrahamyan', subject: 'English', tags: ['IELTS', 'Business English', 'Conversation', 'Writing'],
    rating: 4.7, students: 1432, courses: 11, verified: true, featured: false,
    photo: 'https://i.pravatar.cc/300?img=56',
    bio: 'Certified IELTS instructor with 10+ years experience. Helped hundreds of students achieve their target scores.' },
  { id: 8, name: 'Varduhi Karapetyan', subject: 'Art & Music', tags: ['Piano', 'Music Theory', 'Drawing', 'Watercolor'],
    rating: 4.9, students: 543, courses: 7, verified: true, featured: false,
    photo: 'https://i.pravatar.cc/300?img=43',
    bio: 'Graduate of the Yerevan State Conservatory. Teaching music and visual arts with a focus on creativity.' },
]

const SUBJECTS = [...new Set(ALL_TUTORS.map((t) => t.subject))]

function TutorCard({ tutor, index }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={cn(
        'card-base overflow-hidden transition-all duration-700',
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
      )}
      style={{ transitionDelay: `${(index % 3) * 80}ms` }}
    >
      {/* Banner */}
      <div className="h-20 gradient-brand relative">
        {tutor.featured && (
          <span className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
            ⭐ Featured
          </span>
        )}
      </div>

      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="relative -mt-10 mb-4">
          <img
            src={tutor.photo}
            alt={tutor.name}
            className="h-20 w-20 rounded-2xl border-4 border-white shadow-md object-cover"
          />
          {tutor.verified && (
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs shadow border-2 border-white">
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>

        <h3 className="font-bold text-lg leading-tight mb-0.5">{tutor.name}</h3>
        <p className="text-primary font-semibold text-sm mb-2">{tutor.subject}</p>

        <div className="flex items-center gap-1 mb-3">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-sm">{tutor.rating}</span>
          <span className="text-xs text-muted-foreground">· {tutor.students.toLocaleString()} students</span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">{tutor.bio}</p>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {tutor.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
              {tag}
            </span>
          ))}
          {tutor.tags.length > 3 && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">+{tutor.tags.length - 3}</span>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span>{tutor.courses} courses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{tutor.students.toLocaleString()} students</span>
          </div>
        </div>

        <Button className="w-full" asChild>
          <Link to={`/courses?tutor_name=${encodeURIComponent(tutor.name)}`}>View Courses</Link>
        </Button>
      </div>
    </div>
  )
}

export default function Tutors() {
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')

  const filtered = ALL_TUTORS.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    const matchSubject = !subject || t.subject === subject
    return matchSearch && matchSubject
  })

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="gradient-brand py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots pointer-events-none" />
        <div className="container relative z-10 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-white/30">Our Instructors</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Meet Your Tutors</h1>
          <p className="text-indigo-200 text-lg max-w-xl mx-auto mb-8">
            Learn from verified experts — professors, researchers, and professionals who are passionate about teaching in Armenian.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              className="pl-12 h-13 text-base rounded-xl bg-white shadow-lg border-0"
              placeholder="Search by name, subject, or skill…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="border-b bg-white">
        <div className="container py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            {[
              { v: ALL_TUTORS.length, l: 'Expert tutors' },
              { v: ALL_TUTORS.filter((t) => t.verified).length, l: 'Verified' },
              { v: ALL_TUTORS.reduce((s, t) => s + t.courses, 0), l: 'Courses total' },
              { v: ALL_TUTORS.reduce((s, t) => s + t.students, 0).toLocaleString(), l: 'Students taught' },
            ].map(({ v, l }) => (
              <div key={l} className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{v}</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-slate-50 py-10">
        <div className="container">
          <div className="flex gap-8">
            {/* Sidebar filters */}
            <aside className="hidden lg:block w-52 shrink-0">
              <div className="sticky top-24">
                <h3 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">Subject</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSubject('')}
                    className={cn('w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors', !subject ? 'bg-primary text-white' : 'hover:bg-white')}
                  >
                    All Subjects
                  </button>
                  {SUBJECTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSubject(subject === s ? '' : s)}
                      className={cn('w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors', subject === s ? 'bg-primary text-white' : 'hover:bg-white text-slate-700')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Grid */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-5">
                Showing <strong className="text-foreground">{filtered.length}</strong> tutors
              </p>

              {filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="font-semibold text-lg mb-2">No tutors found</h3>
                  <p className="text-muted-foreground text-sm">Try a different search term or clear the filter.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.map((tutor, i) => (
                    <TutorCard key={tutor.id} tutor={tutor} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="py-16 bg-white border-t">
        <div className="container text-center max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">Are you an expert? Start teaching today.</h2>
          <p className="text-muted-foreground mb-6">Share your knowledge with thousands of Armenian students and earn on your schedule.</p>
          <Button size="lg" asChild>
            <Link to="/register?role=tutor">Become a Tutor</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
