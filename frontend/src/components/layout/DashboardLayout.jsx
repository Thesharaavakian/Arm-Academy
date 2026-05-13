import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, User, MessageSquare, Plus, Users, Award, Settings } from 'lucide-react'
import Navbar from './Navbar'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const studentLinks = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/courses',    icon: BookOpen,         label: 'Browse Courses' },
  { to: '/messages',   icon: MessageSquare,    label: 'Messages' },
  { to: '/groups',     icon: Users,            label: 'Community' },
  { to: '/profile',    icon: User,             label: 'My Profile' },
]

const tutorLinks = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/create-course', icon: Plus,            label: 'Create Course' },
  { to: '/courses',       icon: BookOpen,        label: 'Browse Courses' },
  { to: '/messages',      icon: MessageSquare,   label: 'Messages' },
  { to: '/groups',        icon: Users,           label: 'Community' },
  { to: '/profile',       icon: User,            label: 'Profile' },
]

const adminLinks = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/',     icon: Settings,        label: 'Admin Panel', external: true },
  { to: '/courses',    icon: BookOpen,        label: 'Courses' },
  { to: '/messages',   icon: MessageSquare,   label: 'Messages' },
  { to: '/profile',    icon: User,            label: 'Profile' },
]

export default function DashboardLayout({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()

  const links = user?.role === 'admin'
    ? adminLinks
    : ['tutor', 'teacher'].includes(user?.role)
      ? tutorLinks
      : studentLinks

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="space-y-1 sticky top-24">
              {links.map(({ to, icon: Icon, label, external }) =>
                external ? (
                  <a
                    key={to} href={to} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </a>
                ) : (
                  <Link
                    key={to} to={to}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      location.pathname === to || location.pathname.startsWith(to + '/')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                )
              )}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
