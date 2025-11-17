import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './tailwind.css'

// Limpiar localStorage al iniciar la app para que no haya nadie logueado por defecto
localStorage.removeItem('user')
localStorage.removeItem('token')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
