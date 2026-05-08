import { Link } from 'react-router-dom'
import { Star, Users, Clock, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, truncate, getInitials } from '@/lib/utils'

const levelConfig = {
  beginner:     { label: 'Beginner',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  intermediate: { label: 'Intermediate', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  advanced:     { label: 'Advanced',     color: 'bg-red-50 text-red-700 border-red-200' },
}

const CATEGORY_IMAGES = {
  'Mathematics':       'https://picsum.photos/seed/math-course/640/360',
  'Physics':           'https://picsum.photos/seed/physics-course/640/360',
  'Chemistry':         'https://picsum.photos/seed/chemistry-lab/640/360',
  'Biology':           'https://picsum.photos/seed/biology-nature/640/360',
  'History':           'https://picsum.photos/seed/history-ancient/640/360',
  'Armenian Language': 'https://picsum.photos/seed/language-books/640/360',
  'Computer Science':  'https://picsum.photos/seed/coding-laptop/640/360',
  'English':           'https://picsum.photos/seed/english-learn/640/360',
  'Art':               'https://picsum.photos/seed/art-studio/640/360',
  'Music':             'https://picsum.photos/seed/music-piano/640/360',
  'default':           'https://picsum.photos/seed/education/640/360',
}

export default function CourseCard({ course }) {
  const levelInfo = levelConfig[course.level] || { label: course.level, color: 'bg-slate-100 text-slate-700' }
  const imageUrl = course.cover_image || CATEGORY_IMAGES[course.category] || CATEGORY_IMAGES.default

  return (
    <Link to={`/courses/${course.id}`} className="group block">
      <article className="card-base overflow-hidden h-full flex flex-col">
        {/* Cover image */}
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 shrink-0">
          <img
            src={imageUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {course.is_free && (
            <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              FREE
            </span>
          )}

          <span className={cn('absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm', levelInfo.color)}>
            {levelInfo.label}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-5">
          {course.category && (
            <span className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
              {course.category}
            </span>
          )}

          <h3 className="font-bold text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed flex-1">
            {truncate(course.description, 100)}
          </p>

          {/* Tutor */}
          <div className="flex items-center gap-2 mb-4">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                {getInitials(course.tutor_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-slate-700">{course.tutor_name}</span>
            </span>
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-700">{Number(course.average_rating || 0).toFixed(1)}</span>
              <span>({course.total_reviews || 0})</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{(course.total_students || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
