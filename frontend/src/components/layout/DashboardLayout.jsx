import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, User } from 'lucide-react'
import Navbar from './Navbar'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const studentLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/courses', icon: BookOpen, label: 'Browse Courses' },
  { to: '/profile', icon: User, label: 'My Profile' },
]

const tutorLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/courses', icon: BookOpen, label: 'My Courses' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function DashboardLayout({ children }) {
  const { user } = useAuthStore()
  const location = useLocation()
  const links = user?.role === 'tutor' || user?.role === 'teacher' ? tutorLinks : studentLinks

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="space-y-1 sticky top-24">
              {links.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    location.pathname === to
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
