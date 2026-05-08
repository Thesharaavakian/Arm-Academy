import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, SlidersHorizontal, BookOpen } from 'lucide-react'
import { useSearchParams, Link } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CourseCard from '@/components/courses/CourseCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { coursesApi } from '@/api/courses'
import { cn } from '@/lib/utils'

const LEVELS = [
  { value: 'beginner',     label: 'Beginner',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'advanced',     label: 'Advanced',     color: 'bg-red-50 text-red-700 border-red-200' },
]

const CATEGORIES = [
  { name: 'Mathematics',       icon: '∑',  color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { name: 'Physics',           icon: '⚛',  color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Armenian Language', icon: 'Ա',  color: 'text-red-600',    bg: 'bg-red-50'    },
  { name: 'Computer Science',  icon: '⌨',  color: 'text-slate-600',  bg: 'bg-slate-100' },
  { name: 'Chemistry',         icon: '🧪', color: 'text-green-600',  bg: 'bg-green-50'  },
  { name: 'History',           icon: '📜', color: 'text-amber-600',  bg: 'bg-amber-50'  },
  { name: 'English',           icon: '🌐', color: 'text-sky-600',    bg: 'bg-sky-50'    },
  { name: 'Art & Music',       icon: '🎨', color: 'text-pink-600',   bg: 'bg-pink-50'   },
]

function CourseSkeleton() {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="shimmer aspect-video" />
      <div className="p-5 space-y-3">
        <div className="shimmer h-3 w-16 rounded" />
        <div className="shimmer h-5 w-full rounded" />
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-4 w-1/2 rounded" />
      </div>
    </div>
  )
}

export default function Courses() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [freeOnly, setFreeOnly] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['courses', search, level, category, freeOnly],
    queryFn: () =>
      coursesApi.list({
        search: search || undefined,
        level: level || undefined,
        category: category || undefined,
        is_free: freeOnly || undefined,
      }).then((r) => r.data),
  })

  const courses = data?.results || (Array.isArray(data) ? data : [])
  const totalCount = data?.count ?? courses.length
  const hasFilters = search || level || category || freeOnly

  const clearAll = () => { setSearch(''); setLevel(''); setCategory(''); setFreeOnly(false) }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="bg-slate-900 text-white py-14 relative overflow-hidden">
        <div className="absolute inset-0 pattern-grid opacity-30 pointer-events-none" />
        <div className="container relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Browse Courses</h1>
          <p className="text-slate-400 text-lg mb-8">Discover courses taught by Armenia's best educators</p>

          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              className="pl-12 h-13 text-base bg-white/10 border-white/15 text-white placeholder:text-slate-400 focus-visible:ring-white/30 rounded-xl"
              placeholder="Search courses, topics, tutors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category quick-filter bar */}
      <div className="bg-white border-b sticky top-16 z-30 overflow-x-auto">
        <div className="container">
          <div className="flex items-center gap-2 py-3 min-w-max">
            <button
              onClick={() => setCategory('')}
              className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
                !category ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:border-primary/40 text-slate-600')}
            >
              All
            </button>
            {CATEGORIES.map(({ name, icon, color, bg }) => (
              <button
                key={name}
                onClick={() => setCategory(category === name ? '' : name)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap',
                  category === name
                    ? 'bg-primary text-white border-primary'
                    : cn('border-slate-200 hover:border-primary/40 text-slate-700', bg),
                )}
              >
                <span>{icon}</span> {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 bg-slate-50">
        <div className="container py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-32 space-y-6">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">Level</h3>
                  <div className="space-y-1">
                    {LEVELS.map(({ value, label, color }) => (
                      <button
                        key={value}
                        onClick={() => setLevel(level === value ? '' : value)}
                        className={cn(
                          'w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium',
                          level === value ? 'bg-primary text-white shadow-sm' : cn('hover:bg-white border border-transparent hover:border-slate-200', color),
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">Price</h3>
                  <button
                    onClick={() => setFreeOnly(!freeOnly)}
                    className={cn(
                      'w-full text-left text-sm px-3 py-2.5 rounded-xl transition-all font-medium',
                      freeOnly ? 'bg-primary text-white shadow-sm' : 'hover:bg-white border border-transparent hover:border-slate-200',
                    )}
                  >
                    Free courses only
                  </button>
                </div>

                {hasFilters && (
                  <Button variant="outline" size="sm" className="w-full" onClick={clearAll}>
                    <X className="h-3.5 w-3.5 mr-1.5" /> Clear all filters
                  </Button>
                )}
              </div>
            </aside>

            {/* Main */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
                <div>
                  {!isLoading && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{totalCount}</span> courses found
                      {category && <span className="ml-1">in <span className="text-primary font-medium">{category}</span></span>}
                    </p>
                  )}
                </div>

                {/* Active filter chips */}
                <div className="flex flex-wrap gap-2">
                  {level && (
                    <Badge variant="secondary" className="capitalize gap-1.5">
                      {level}
                      <button onClick={() => setLevel('')} className="hover:text-foreground"><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                  {freeOnly && (
                    <Badge variant="secondary" className="gap-1.5">
                      Free
                      <button onClick={() => setFreeOnly(false)} className="hover:text-foreground"><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 9 }).map((_, i) => <CourseSkeleton key={i} />)}
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">No courses found</h3>
                  <p className="text-muted-foreground text-sm mb-5">Try adjusting your filters or search term.</p>
                  {hasFilters && <Button variant="outline" onClick={clearAll}>Clear all filters</Button>}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {courses.map((course) => <CourseCard key={course.id} course={course} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
