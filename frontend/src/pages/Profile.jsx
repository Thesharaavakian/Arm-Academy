import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Save, Loader2, Star, BookOpen, Users, Award, Edit3, Check, ExternalLink } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'
import { usersApi, progressApi, certificatesApi } from '@/api/users'
import { getInitials, formatDate, cn } from '@/lib/utils'

const ROLE_STYLES = {
  student: 'bg-blue-100 text-blue-700',
  tutor: 'bg-indigo-100 text-indigo-700',
  teacher: 'bg-violet-100 text-violet-700',
  admin: 'bg-red-100 text-red-700',
}

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.profile().then((r) => r.data),
  })

  const { data: progressData } = useQuery({
    queryKey: ['progress'],
    queryFn: () => progressApi.list().then((r) => r.data),
  })

  const { data: certsData } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesApi.list().then((r) => r.data),
  })

  const display = profile || user
  const progress = progressData?.results || progressData || []
  const certs = certsData?.results || certsData || []
  const isTutor = display?.role === 'tutor' || display?.role === 'teacher'
  const fullName = display?.first_name ? `${display.first_name} ${display.last_name}`.trim() : display?.username

  const [form, setForm] = useState({
    first_name: display?.first_name || '',
    last_name: display?.last_name || '',
    bio: display?.bio || '',
    phone_number: display?.phone_number || '',
    expertise_areas: display?.expertise_areas || '',
    hourly_rate: display?.hourly_rate || '',
  })

  const updateMutation = useMutation({
    mutationFn: (data) => usersApi.updateProfile(data),
    onSuccess: ({ data }) => {
      updateUser(data)
      queryClient.invalidateQueries(['profile'])
      setEditing(false)
      toast({ title: 'Profile updated!', variant: 'success' })
    },
    onError: () => toast({ title: 'Update failed', description: 'Please try again.', variant: 'destructive' }),
  })

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const handleSave = () => updateMutation.mutate(form)

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">

        {/* Profile header card */}
        <div className="card-base overflow-hidden">
          {/* Cover photo */}
          <div className="h-28 gradient-brand relative">
            <div className="absolute inset-0 pattern-dots opacity-40" />
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-5 flex-wrap gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                  <AvatarImage src={display?.profile_picture} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                {editing && (
                  <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md border-2 border-white">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {!editing ? (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold">{fullName}</h2>
                  {display?.is_verified && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
                      <Check className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-sm text-muted-foreground">@{display?.username}</span>
                  <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize', ROLE_STYLES[display?.role] || 'bg-slate-100 text-slate-700')}>
                    {display?.role}
                  </span>
                </div>
              </div>
            </div>

            {display?.bio && !editing && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">{display.bio}</p>
            )}

            {isTutor && !editing && (
              <div className="flex flex-wrap gap-6 mt-5 text-sm text-muted-foreground pt-4 border-t">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-slate-800">{Number(display?.average_rating || 0).toFixed(1)}</span>
                  <span>avg rating</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="font-semibold text-slate-800">{display?.total_students || 0}</span>
                  <span>students</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-semibold text-slate-800">{display?.total_reviews || 0}</span>
                  <span>reviews</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="details">Account Details</TabsTrigger>
            {!isTutor && <TabsTrigger value="learning">My Learning</TabsTrigger>}
            {isTutor && <TabsTrigger value="teaching">Teaching</TabsTrigger>}
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          {/* Account details */}
          <TabsContent value="details">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>First name</Label>
                    <Input name="first_name" value={form.first_name} onChange={handleChange} disabled={!editing} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input name="last_name" value={form.last_name} onChange={handleChange} disabled={!editing} className="mt-1.5" />
                  </div>
                </div>

                <div>
                  <Label>Bio</Label>
                  <Textarea
                    name="bio" value={form.bio} onChange={handleChange} disabled={!editing}
                    rows={3} placeholder="Tell students about yourself…"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>Phone number</Label>
                  <Input name="phone_number" value={form.phone_number} onChange={handleChange} disabled={!editing} placeholder="+374 XX XXX XXX" className="mt-1.5" />
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="font-medium mb-2 text-slate-700">Account Information</div>
                  <div className="space-y-1.5 text-muted-foreground">
                    <div className="flex gap-2"><span className="w-24 shrink-0">Email</span><span className="font-medium text-slate-700">{display?.email}</span></div>
                    <div className="flex gap-2"><span className="w-24 shrink-0">Username</span><span className="font-medium text-slate-700">@{display?.username}</span></div>
                    <div className="flex gap-2"><span className="w-24 shrink-0">Member since</span><span className="font-medium text-slate-700">{formatDate(display?.created_at)}</span></div>
                  </div>
                </div>

                {isTutor && (
                  <>
                    <Separator />
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tutor Settings</div>
                    <div>
                      <Label>Expertise areas</Label>
                      <Input name="expertise_areas" value={form.expertise_areas} onChange={handleChange} disabled={!editing} placeholder="e.g. Mathematics, Physics, Computer Science" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Hourly rate (AMD)</Label>
                      <Input name="hourly_rate" type="number" value={form.hourly_rate} onChange={handleChange} disabled={!editing} placeholder="5000" className="mt-1.5" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning (students) */}
          <TabsContent value="learning">
            {progress.length === 0 ? (
              <div className="card-base p-10 text-center border-dashed">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">No courses yet</p>
                <p className="text-sm text-muted-foreground mb-4">Browse courses and start learning today.</p>
                <Button asChild size="sm"><a href="/courses">Browse Courses</a></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {progress.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1.5 truncate">{p.course_title}</div>
                        <div className="flex items-center gap-3">
                          <Progress value={p.completion_percentage || 0} className="flex-1 h-2" />
                          <span className="text-xs font-semibold text-primary shrink-0">{Math.round(p.completion_percentage || 0)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {p.is_completed ? '✅ Completed' : `${p.attended_classes || 0} / ${p.total_classes || 0} classes attended`}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild className="shrink-0">
                        <a href={`/courses/${p.course}`}>View</a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Teaching (tutors) */}
          <TabsContent value="teaching">
            <div className="card-base p-8 text-center border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Manage your courses</p>
              <p className="text-sm text-muted-foreground mb-4">Go to your dashboard to manage and create courses.</p>
              <Button asChild size="sm"><a href="/dashboard">Go to Dashboard</a></Button>
            </div>
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates">
            {certs.length === 0 ? (
              <div className="card-base p-10 text-center border-dashed">
                <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">No certificates yet</p>
                <p className="text-sm text-muted-foreground">Complete a course to earn your first certificate!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {certs.map((cert) => (
                  <div key={cert.id} className="card-base p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl shrink-0">🏅</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm mb-0.5 truncate">{cert.course_title}</div>
                        <div className="text-xs text-amber-700 font-medium">Completed {formatDate(cert.issue_date)}</div>
                        <div className="text-xs font-mono text-amber-600 mt-1 truncate">#{cert.certificate_number}</div>
                        <button className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                          <ExternalLink className="h-3 w-3" /> View certificate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
