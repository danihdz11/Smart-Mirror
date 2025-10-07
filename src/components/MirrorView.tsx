import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type MirrorViewProps = {
  children?: ReactNode
}

export default function MirrorView({ children }: MirrorViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (e) {
        console.error(e)
        setError('No se pudo acceder a la cámara. Revisa permisos/HTTPS.')
      }
    }
    start()

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Video espejo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)]"
      />

      {/* Overlay para widgets */}
      <div className="absolute inset-0 pointer-events-none">
        {children}
      </div>

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/80 text-white px-4 py-2 rounded-lg pointer-events-auto">
          {error}
        </div>
      )}
    </div>
  )
}
