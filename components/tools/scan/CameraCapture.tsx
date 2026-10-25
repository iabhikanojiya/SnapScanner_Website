'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Circle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/tools/Feedback'

type CameraState = 'starting' | 'live' | 'denied' | 'unavailable' | 'error'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
  count: number
}

/**
 * Live camera preview with a shutter button. Uses the rear camera where there
 * is one. Frames never leave the browser: each capture becomes a local File.
 */
export default function CameraCapture({ onCapture, onClose, count }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>('starting')
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unavailable')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => undefined)
        }
        setState('live')
      } catch (e) {
        const name = e instanceof DOMException ? e.name : ''
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'unavailable' : 'error')
      }
    }
    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        canvas.width = canvas.height = 0
        if (!blob) return
        onCapture(new File([blob], `scan-${count + 1}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }))
        setFlash(true)
        setTimeout(() => setFlash(false), 150)
      },
      'image/jpeg',
      0.92
    )
  }

  if (state === 'denied' || state === 'unavailable' || state === 'error') {
    return (
      <Alert
        tone="warning"
        title={state === 'denied' ? 'Camera access was blocked' : state === 'unavailable' ? 'No camera available' : 'The camera couldn’t start'}
      >
        {state === 'denied'
          ? 'Allow camera access for this site in your browser settings and try again, or upload photos of your documents instead.'
          : 'This device or browser doesn’t offer a camera here. Upload photos of your documents instead.'}
        <div className="mt-2">
          <Button variant="secondary" size="xs" onClick={onClose}>
            <CameraOff aria-hidden className="h-4 w-4" />
            Close camera
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-gray-900">
      <div className="relative flex max-h-[70dvh] items-center justify-center">
        <video ref={videoRef} playsInline muted className="max-h-[70dvh] w-full object-contain" aria-label="Camera preview" />
        {state === 'starting' && <p className="absolute text-sm text-white">Starting camera… Allow access if your browser asks.</p>}
        {flash && <div className="pointer-events-none absolute inset-0 bg-white/70" />}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10 hover:text-white">
          <X aria-hidden className="h-4 w-4" />
          Done
        </Button>
        <button
          type="button"
          onClick={capture}
          disabled={state !== 'live'}
          aria-label="Capture page"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-brand-600 text-white transition-transform active:scale-95 disabled:opacity-50"
        >
          <Circle aria-hidden className="h-7 w-7 fill-current" />
        </button>
        <span className="flex min-w-20 items-center justify-end gap-1.5 text-sm text-white" aria-live="polite">
          <Camera aria-hidden className="h-4 w-4" />
          {count} page{count === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
