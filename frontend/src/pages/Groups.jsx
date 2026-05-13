import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Search, Lock, Globe, BookOpen, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/useToast'
import { useInView } from '@/hooks/useInView'
import { getInitials, cn } from '@/lib/utils'
import api from '@/api/client'

const groupsApi = {
  list:   (params) => api.get('/groups/', { params }),
  create: (data)   => api.post('/groups/', data),
  join:   (id)     => api.post(`/groups/${id}/join/`),
  leave:  (id)     => api.post(`/groups/${id}/leave/`),
}

const TYPE_CONFIG = {
  study:     { label: 'Study Group',   color: 'bg-blue-50 text-blue-700',    border: 'border-blue-200' },
  class:     { label: 'Class Group',   color: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' },
  community: { label: 'Community',     color: 'bg-violet-50 text-violet-700', border: 'border-violet-200' },
}

function GroupCard({ group, userId, onJoin, onLeave, index }) {
  const { ref, inView } = useInView()
  const isMember = group.members?.includes(userId) || group.member_ids?.includes(userId)
  const typeConf  = TYPE_CONFIG[group.group_type] || TYPE_CONFIG.community

  return (
    <div ref={ref}
      className={cn('card-base overflow-hidden transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}
      style={{ transitionDelay: `${(index % 3) * 80}ms` }}
    >
      <div className="h-1.5 gradient-brand w-full" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 font-bold text-lg">
              {group.name?.[0]?.toUpperCase() || 'G'}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight truncate">{group.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', typeConf.color)}>{typeConf.label}</span>
                {group.is_private ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Globe className="h-3 w-3 text-muted-foreground" />}
              </div>
            </div>
          </div>
        </div>

        {group.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{group.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{group.member_count || 0} members</span>
          </div>
          {userId ? (
            isMember ? (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onLeave(group.id)}>
                Leave
              </Button>
            ) : (
              <Button size="sm" className="text-xs h-7" onClick={() => onJoin(group.id)}>
                {group.require_approval ? 'Request' : 'Join'}
              </Button>
            )
          ) : (
            <Button size="sm" variant="outline" className="text-xs h-7" asChild>
              <a href="/login">Sign in to join</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateGroupModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', group_type: 'study', is_private: false, require_approval: false })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const { data } = await groupsApi.create(form)
      toast({ title: 'Group created!', variant: 'success' })
      onCreated(data)
    } catch (err) {
      toast({ title: 'Failed to create group', description: err.response?.data?.detail, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-lg">Create a Group</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><Label>Group Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Calculus Study Circle" className="mt-1.5" required /></div>
          <div><Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({...f, description: e.target.value}))} placeholder="What is this group about?" rows={3} className="mt-1.5" /></div>
          <div><Label>Type</Label>
            <Select value={form.group_type} onChange={(e) => setForm(f => ({...f, group_type: e.target.value}))} className="mt-1.5">
              <option value="study">Study Group</option>
              <option value="class">Class Group</option>
              <option value="community">Community</option>
            </Select></div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_private} onChange={(e) => setForm(f => ({...f, is_private: e.target.checked}))} className="rounded" />
              Private group
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.require_approval} onChange={(e) => setForm(f => ({...f, require_approval: e.target.checked}))} className="rounded" />
              Require approval
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={!form.name.trim() || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Groups() {
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['groups', search, typeFilter],
    queryFn: () => groupsApi.list({ search: search || undefined, group_type: typeFilter || undefined }).then(r => r.data),
    staleTime: 60_000,
  })
  const groups = Array.isArray(data) ? data : (data?.results || [])

  const joinMutation = useMutation({
    mutationFn: (id) => groupsApi.join(id),
    onSuccess: () => { refetch(); toast({ title: 'Joined group!', variant: 'success' }) },
  })
  const leaveMutation = useMutation({
    mutationFn: (id) => groupsApi.leave(id),
    onSuccess: () => { refetch(); toast({ title: 'Left group', variant: 'success' }) },
  })

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <section className="gradient-brand py-14 relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots pointer-events-none" />
        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Community Groups</h1>
              <p className="text-indigo-200 max-w-xl">Join study circles, class groups, and communities — learn together with fellow Armenian students.</p>
            </div>
            {isAuthenticated && (
              <Button variant="white" onClick={() => setShowCreate(true)} className="shrink-0 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />Create Group
              </Button>
            )}
          </div>

          <div className="mt-6 flex gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search groups…"
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-10" />
            </div>
            {['study','class','community'].map(t => (
              <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                className={cn('px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                  typeFilter === t ? 'bg-white text-primary border-white' : 'border-white/30 text-white hover:bg-white/10')}>
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch() }}
        />
      )}

      <div className="flex-1 container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 card-base border-dashed max-w-md mx-auto">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No groups yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Be the first to create a community group!</p>
            {isAuthenticated
              ? <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create Group</Button>
              : <Button asChild><a href="/register">Join Arm Academy</a></Button>
            }
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-5">
              <strong className="text-foreground">{groups.length}</strong> groups found
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map((g, i) => (
                <GroupCard key={g.id} group={g} userId={user?.id} index={i}
                  onJoin={joinMutation.mutate} onLeave={leaveMutation.mutate} />
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
