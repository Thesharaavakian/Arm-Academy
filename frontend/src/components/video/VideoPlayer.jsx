/**
 * Secure video player with:
 * - Short-lived access token (requested from backend)
 * - Moving semi-transparent watermark (user email/ID)
 * - Right-click disabled on video
 * - Download button hidden via controlsList
 * - Keyboard shortcuts for seeking/volume preserved
 */
import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertTriangle, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'
import { cn } from '@/lib/utils'

const WATERMARK_POSITIONS = [
  { top: '10%', left: '5%' },
  { top: '10%', left: '70%' },
  { top: '50%', left: '5%' },
  { top: '50%', left: '70%' },
  { top: '80%', left: '5%' },
  { top: '80%', left: '60%' },
  { top: '30%', left: '35%' },
]

export default function VideoPlayer({ videoId, classTitle, isPreview = false, className }) {
  const { user, isAuthenticated } = useAuthStore()
  const videoRef = useRef(null)
  const [videoUrl, setVideoUrl]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [watermarkText, setWatermarkText] = useState('')
  const [wmPos, setWmPos]           = useState(WATERMARK_POSITIONS[0])

  // Request access token then stream URL
  useEffect(() => {
    if (!videoId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // Step 1 — get a short-lived access token
        const { data: tokenData } = await api.get(`/videos/${videoId}/request_access/`)
        if (cancelled) return

        // Step 2 — exchange token for stream URL
        const { data: streamData } = await api.get(
          `/videos/${videoId}/stream/?token=${tokenData.token}`
        )
        if (cancelled) return

        setVideoUrl(streamData.url)
        setWatermarkText(streamData.watermark?.text || user?.email || '')
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.detail || 'Could not load video.'
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [videoId])

  // Move watermark every 30 seconds to cover more of the video
  useEffect(() => {
    if (!watermarkText) return
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % WATERMARK_POSITIONS.length
      setWmPos(WATERMARK_POSITIONS[idx])
    }, 30_000)
    return () => clearInterval(interval)
  }, [watermarkText])

  // Disable right-click context menu on the video element
  const onContextMenu = (e) => e.preventDefault()

  if (!isAuthenticated && !isPreview) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-slate-900 rounded-2xl aspect-video', className)}>
        <Lock className="h-12 w-12 text-slate-400 mb-3" />
        <p className="text-slate-300 font-medium">Sign in to watch</p>
        <p className="text-slate-500 text-sm mt-1">Create a free account to access this content</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-900 rounded-2xl aspect-video', className)}>
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading video…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-slate-900 rounded-2xl aspect-video', className)}>
        <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
        <p className="text-slate-300 font-medium">Video unavailable</p>
        <p className="text-slate-500 text-sm mt-1 max-w-xs text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn('relative bg-black rounded-2xl overflow-hidden', className)}>
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full aspect-video"
        onContextMenu={onContextMenu}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture={false}
        playsInline
      >
        Your browser does not support video playback.
      </video>

      {/* Floating watermark — semi-transparent, moves position every 30s */}
      {watermarkText && (
        <div
          className="absolute pointer-events-none select-none transition-all duration-1000"
          style={{
            top: wmPos.top,
            left: wmPos.left,
            transform: 'rotate(-12deg)',
            opacity: 0.18,
            zIndex: 10,
          }}
        >
          <span className="text-white text-xs font-medium whitespace-nowrap">
            {watermarkText}
          </span>
        </div>
      )}

      {/* Corner badge */}
      {watermarkText && (
        <div className="absolute bottom-12 right-3 pointer-events-none select-none opacity-15 z-10">
          <span className="text-white text-[10px]">{watermarkText.split('@')[0]}</span>
        </div>
      )}
    </div>
  )
}
