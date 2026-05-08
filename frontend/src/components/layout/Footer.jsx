import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              Arm Academy
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Connecting Armenian-speaking learners with expert educators through live classes, recorded courses, and community groups.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses" className="hover:text-white transition-colors">Browse Courses</Link></li>
              <li><Link to="/register?role=tutor" className="hover:text-white transition-colors">Become a Tutor</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Sign Up Free</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Log In</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">My Profile</Link></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-slate-700" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p>© {new Date().getFullYear()} Arm Academy. All rights reserved.</p>
          <p className="text-slate-500">Built with ❤️ for Armenian learners</p>
        </div>
      </div>
    </footer>
  )
}
