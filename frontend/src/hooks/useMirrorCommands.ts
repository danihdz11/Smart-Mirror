import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { synthesizeSpeech } from '../services/api';

interface UseMirrorCommandsProps {
  speak: (text: string) => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  isProcessingRef: React.MutableRefObject<boolean>;
}

export function useMirrorCommands({
  speak,
  startListening,
  stopListening,
  isProcessingRef,
}: UseMirrorCommandsProps) {
  const location = useLocation();
  const hasWelcomedToProfileRef = useRef(false);
  const isReadingNewsRef = useRef(false);

  // Función para obtener y leer las noticias del widget
  const fetchNewsAndRead = async () => {
    try {
      console.log('Obteniendo noticias del widget...');
      await speak('Obteniendo las noticias del día');
      
      const response = await fetch('http://localhost:5001/api/news');
      const data = await response.json();
      const articles = (data?.data || []).slice(0, 5);
      
      if (articles.length === 0) {
        await speak('Lo siento, no pude obtener las noticias en este momento');
        setTimeout(() => {
          isReadingNewsRef.current = false;
          startListening();
        }, 2000);
        return;
      }
      
      setTimeout(async () => {
        let newsText = 'Aquí están las noticias del día. ';
        
        articles.forEach((article: any, index: number) => {
          const title = article.title || 'Sin título';
          const source = article.source?.name || 'Fuente desconocida';
          newsText += `Noticia ${index + 1}: ${title}. Fuente: ${source}. `;
        });
        
        newsText += 'Eso es todo por ahora.';

        console.log('Leyendo noticias:', newsText);
        
        await speak(newsText);
        
        console.log('Terminó de leer las noticias');
        isReadingNewsRef.current = false;
        
        setTimeout(() => {
          if (location.pathname === '/mirror') {
            startListening();
          }
        }, 1000);
      }, 2000);
      
    } catch (error) {
      console.error('Error al obtener noticias:', error);
      await speak('Lo siento, no pude obtener las noticias en este momento');
      setTimeout(() => {
        isReadingNewsRef.current = false;
        startListening();
      }, 2000);
    }
  };

  // Función para procesar comandos cuando el usuario está logueado
  const processLoggedInCommand = (transcript: string): boolean => {
    // Solo procesar si estamos en /mirror
    if (location.pathname !== '/mirror') {
      return false;
    }

    const normalized = transcript.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    
    // Detectar comando para leer noticias
    if (!isReadingNewsRef.current && 
        (normalized.includes('dime las noticias') || 
         normalized.includes('dime las noticia') ||
         normalized.includes('lee las noticias') ||
         normalized.includes('lee las noticia') ||
         normalized.includes('cuéntame las noticias') ||
         normalized.includes('cuentame las noticias'))) {
      console.log('Usuario pidió leer las noticias...');
      
      isReadingNewsRef.current = true;
      stopListening();
      fetchNewsAndRead();
      
      return true;
    }
    
    // Detectar comando para salir/logout
    if (normalized.includes('salir') || 
        normalized.includes('cerrar sesion') ||
        normalized.includes('cerrar sesión') ||
        normalized.includes('logout') ||
        normalized.includes('desconectar')) {
      console.log('Usuario pidió salir, ejecutando logout...');
      
      stopListening();
      
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      window.dispatchEvent(new CustomEvent('userLogout'));
      
      hasWelcomedToProfileRef.current = false;
      
      speak('Sesión cerrada. Hasta luego.');
      
      setTimeout(() => {
        startListening();
      }, 3000);
      
      return true;
    }

    return false;
  };

  // Cuando el usuario entra a su perfil
  useEffect(() => {
    if (location.pathname === '/mirror') {
      const userFromStorage = localStorage.getItem('user');
      
      if (userFromStorage && !hasWelcomedToProfileRef.current) {
        try {
          const user = JSON.parse(userFromStorage);
          const userName = user.name || 'Usuario';
          
          console.log(`Usuario ${userName} entró a su perfil, saludando...`);
          
          const timer = setTimeout(() => {
            hasWelcomedToProfileRef.current = true;
            speak(`Bienvenido ${userName}, dime, ¿en qué te puedo ayudar hoy?`);
          }, 1000);

          return () => {
            clearTimeout(timer);
          };
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
    } else if (location.pathname !== '/mirror') {
      hasWelcomedToProfileRef.current = false;
    }
  }, [location.pathname, speak]);

  return {
    processLoggedInCommand,
    isReadingNewsRef,
    hasWelcomedToProfileRef,
  };
}

