import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'
import CookieBanner from '@/components/ui/CookieBanner'

const Landing        = lazy(() => import('@/pages/Landing'))
const Login          = lazy(() => import('@/pages/Login'))
const Register       = lazy(() => import('@/pages/Register'))
const VerifyEmail    = lazy(() => import('@/pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('@/pages/ResetPassword'))
const Dashboard      = lazy(() => import('@/pages/Dashboard'))
const Courses        = lazy(() => import('@/pages/Courses'))
const CourseDetail   = lazy(() => import('@/pages/CourseDetail'))
const Tutors         = lazy(() => import('@/pages/Tutors'))
const Profile        = lazy(() => import('@/pages/Profile'))
const Messages       = lazy(() => import('@/pages/Messages'))
const Groups         = lazy(() => import('@/pages/Groups'))
const CreateCourse   = lazy(() => import('@/pages/tutor/CreateCourse'))
const ManageCourse   = lazy(() => import('@/pages/tutor/ManageCourse'))
const NotFound       = lazy(() => import('@/pages/NotFound'))

function TutorRoute({ children }) {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!['tutor', 'teacher', 'admin'].includes(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-2xl gradient-brand animate-pulse shadow-glow" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/"                 element={<Landing />} />
            <Route path="/login"            element={<Login />} />
            <Route path="/register"         element={<Register />} />
            <Route path="/verify-email"     element={<VerifyEmail />} />
            <Route path="/forgot-password"  element={<ForgotPassword />} />
            <Route path="/reset-password"   element={<ResetPassword />} />
            <Route path="/courses"          element={<Courses />} />
            <Route path="/courses/:id"      element={<CourseDetail />} />
            <Route path="/tutors"           element={<Tutors />} />

            {/* Protected — any authenticated user */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/messages"  element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/groups"    element={<Groups />} />

            {/* Protected — tutors/teachers only */}
            <Route path="/create-course"      element={<TutorRoute><CreateCourse /></TutorRoute>} />
            <Route path="/courses/:id/manage" element={<TutorRoute><ManageCourse /></TutorRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <CookieBanner />
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}
