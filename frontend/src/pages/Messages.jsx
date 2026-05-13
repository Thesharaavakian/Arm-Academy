import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Search, MessageSquare, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'
import { getInitials, formatDateTime, cn } from '@/lib/utils'

const messagesApi = {
  conversations: ()           => api.get('/messages/conversations/'),
  thread:        (withId)     => api.get('/messages/thread/', { params: { with: withId } }),
  send:          (recipientId, content) => api.post('/messages/', { recipient: recipientId, content }),
}

function ConversationItem({ conv, selected, onClick }) {
  const { user: me } = useAuthStore()
  const u = conv.user
  const name = u.display_name || u.username
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
        selected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-slate-50',
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={u.profile_picture} />
          <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {conv.unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
            {conv.unread_count > 9 ? '9+' : conv.unread_count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm truncate">{name}</span>
          {conv.last_message_time && (
            <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(conv.last_message_time)}</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {conv.i_sent_last && <span className="text-xs text-muted-foreground">You: </span>}
          <p className="text-xs text-muted-foreground truncate">{conv.last_message || 'No messages yet'}</p>
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ msg, isMe }) {
  return (
    <div className={cn('flex items-end gap-2 mb-3', isMe ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
          isMe
            ? 'gradient-brand text-white rounded-br-sm'
            : 'bg-white border text-slate-800 rounded-bl-sm shadow-sm',
        )}
      >
        <p className="leading-relaxed">{msg.content}</p>
        <p className={cn('text-[10px] mt-1', isMe ? 'text-white/70 text-right' : 'text-slate-400')}>
          {formatDateTime(msg.created_at)}
          {isMe && msg.is_read && ' · ✓✓'}
        </p>
      </div>
    </div>
  )
}

export default function Messages() {
  const { user } = useAuthStore()
  const [sp, setSp] = useSearchParams()
  const queryClient = useQueryClient()
  const activeId = sp.get('with') ? Number(sp.get('with')) : null
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)

  const { data: convs = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.conversations().then(r => r.data),
    refetchInterval: 5000,
  })

  const { data: thread = [], isLoading: threadLoading } = useQuery({
    queryKey: ['thread', activeId],
    queryFn: () => messagesApi.thread(activeId).then(r => r.data),
    enabled: !!activeId,
    refetchInterval: 3000,
  })

  const sendMutation = useMutation({
    mutationFn: ({ recipientId, content }) => messagesApi.send(recipientId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', activeId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setDraft('')
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const handleSend = (e) => {
    e.preventDefault()
    if (!draft.trim() || !activeId) return
    sendMutation.mutate({ recipientId: activeId, content: draft.trim() })
  }

  const activeConv = convs.find(c => c.user.id === activeId)
  const activeName = activeConv?.user.display_name || activeConv?.user.username || ''

  const filtered = convs.filter(c =>
    (c.user.display_name || c.user.username || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex-1 container py-4 flex gap-0 rounded-2xl overflow-hidden border bg-white shadow-card" style={{ height: 'calc(100vh - 80px)', maxHeight: '85vh' }}>
        {/* Left — conversations list */}
        <aside className="w-80 shrink-0 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…" className="pl-9 h-9" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                No conversations yet
              </div>
            ) : (
              filtered.map(conv => (
                <ConversationItem
                  key={conv.user.id}
                  conv={conv}
                  selected={activeId === conv.user.id}
                  onClick={() => setSp({ with: conv.user.id })}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right — thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm">Choose someone from the list to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b bg-white">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={activeConv?.user.profile_picture} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{getInitials(activeName)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{activeName}</div>
                  <div className="text-xs text-muted-foreground capitalize">{activeConv?.user.role}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/50">
                {threadLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : thread.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">No messages yet. Say hello!</div>
                ) : (
                  thread.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} isMe={msg.sender === user?.id} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <form onSubmit={handleSend} className="flex items-center gap-3 p-4 border-t bg-white">
                <Input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 h-11"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e) }}
                />
                <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!draft.trim() || sendMutation.isPending}>
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
