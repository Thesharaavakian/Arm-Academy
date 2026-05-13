import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, LayoutDashboard, LogOut, User, Menu, X, Users, ChevronDown, Bell, MessageSquare } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn, getInitials } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/courses', label: 'Courses' },
  { to: '/tutors', label: 'Tutors' },
]

const AUTH_NAV_LINKS = [
  { to: '/messages', label: 'Messages', icon: MessageSquare },
]

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const handleLogout = async () => {
    try { await authApi.logout(localStorage.getItem('refresh_token')) } catch {}
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname.startsWith(path)
  const fullName = user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.username

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b shadow-sm'
          : 'bg-white border-b',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-primary shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand shadow-sm">
            <BookOpen className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="hidden sm:block">Arm Academy</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive(to) ? 'text-primary bg-primary/8' : 'text-slate-600 hover:text-primary hover:bg-slate-50')}>
              {label}
            </Link>
          ))}
          {isAuthenticated && AUTH_NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive(to) ? 'text-primary bg-primary/8' : 'text-slate-600 hover:text-primary hover:bg-slate-50')}>
              {Icon && <Icon className="h-4 w-4" />}{label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Notification bell */}
              <button className="relative hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors outline-none focus:ring-2 focus:ring-primary/30">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profile_picture} />
                      <AvatarFallback className="text-xs font-semibold">{getInitials(fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:block text-left">
                      <div className="text-sm font-medium leading-tight">{fullName}</div>
                      <div className="text-xs text-muted-foreground capitalize leading-tight">{user?.role}</div>
                    </div>
                    <ChevronDown className="hidden lg:block h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-semibold">{fullName}</div>
                    <div className="text-xs text-muted-foreground font-normal capitalize">{user?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive focus:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" className="shadow-sm" asChild>
                <Link to="/register">Get started free</Link>
              </Button>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'md:hidden border-t bg-white overflow-hidden transition-all duration-300',
          mobileOpen ? 'max-h-96' : 'max-h-0',
        )}
      >
        <div className="container py-4 space-y-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(to) ? 'text-primary bg-primary/8' : 'text-slate-700 hover:bg-slate-50',
              )}
            >
              {label}
            </Link>
          ))}

          <div className="pt-2 border-t mt-2">
            {isAuthenticated ? (
              <div className="space-y-1">
                <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link to="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <User className="h-4 w-4" /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/register">Get started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
