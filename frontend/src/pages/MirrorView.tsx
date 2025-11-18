import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

type MirrorViewProps = {
  children?: ReactNode
}

export default function MirrorView({ children }: MirrorViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const [userName, setUserName] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [showPermanentMessage, setShowPermanentMessage] = useState(false)

  useEffect(() => {
    // Obtener nombre del usuario solo desde location state (después de login)
    // No leer de localStorage para que al iniciar la app no haya nadie logueado
    const nameFromState = (location.state as any)?.userName
    
    if (nameFromState) {
      setUserName(nameFromState)
    } else {
      // Si no hay nombre en el state, verificar localStorage (por si viene de un refresh después de login)
      const userFromStorage = localStorage.getItem('user')
      if (userFromStorage) {
        try {
          const user = JSON.parse(userFromStorage)
          setUserName(user.name)
        } catch (e) {
          console.error('Error parsing user from localStorage:', e)
        }
      } else {
        // Si no hay usuario en localStorage, resetear todo
        setUserName(null)
        setShowWelcome(false)
        setShowPermanentMessage(false)
      }
    }
  }, [location.state])

  // Escuchar cambios en localStorage para resetear cuando se hace logout
  useEffect(() => {
    const checkUser = () => {
      const userFromStorage = localStorage.getItem('user')
      if (!userFromStorage) {
        // Si se eliminó el usuario, resetear todo
        setUserName(null)
        setShowWelcome(false)
        setShowPermanentMessage(false)
      }
    }
    
    // Escuchar evento personalizado de logout
    const handleLogout = () => {
      setUserName(null)
      setShowWelcome(false)
      setShowPermanentMessage(false)
    }
    
    // Verificar periódicamente cambios en localStorage
    const interval = setInterval(checkUser, 500)
    
    // Escuchar eventos de storage (por si se modifica desde otra pestaña)
    window.addEventListener('storage', checkUser)
    
    // Escuchar evento personalizado de logout
    window.addEventListener('userLogout', handleLogout)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', checkUser)
      window.removeEventListener('userLogout', handleLogout)
    }
  }, [])

  useEffect(() => {
    // Ocultar mensaje de bienvenida central después de 5 segundos y mostrar el permanente
    if (userName) {
      const timer = setTimeout(() => {
        setShowWelcome(false)
        setShowPermanentMessage(true)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [userName])

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

      {/* Mensaje de bienvenida central */}
      {showWelcome && userName && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-blue-600/95 text-white px-8 py-4 rounded-lg shadow-2xl text-center animate-fade-in">
            <h2 className="text-4xl font-bold mb-2">¡Bienvenido!</h2>
            <p className="text-2xl">{userName}</p>
          </div>
        </div>
      )}

      {/* Mensaje permanente debajo del reloj */}
      {showPermanentMessage && userName && (
        <div className="absolute top-[200px] left-6 pointer-events-none z-40">
          <div className="bg-black/60 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg">
            <p className="text-xl font-medium">A tus órdenes, {userName}</p>
          </div>
        </div>
      )}

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
