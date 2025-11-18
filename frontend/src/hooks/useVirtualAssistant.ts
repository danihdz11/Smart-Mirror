import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Definiciones de tipos para Web Speech API
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

export function useVirtualAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const [isListening, setIsListening] = useState(false);
  const hasGreetedRef = useRef(false);
  const hasAskedLoginRef = useRef(false);
  const isWaitingForAnswerRef = useRef(false);
  const hasWelcomedToProfileRef = useRef(false);
  const isReadingNewsRef = useRef(false);

  // Inicializar reconocimiento de voz
  useEffect(() => {
    // Verificar si el navegador soporta Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    // Inicializar Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'es-MX';
    recognition.continuous = true;
    recognition.interimResults = false;
    // Aumentar el umbral de confianza - solo procesar resultados con buena confianza
    // Nota: esto no está disponible en todos los navegadores, pero ayuda cuando está disponible

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Escuchando...');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.toLowerCase().trim();
      const confidence = lastResult[0].confidence || 0;
      
      console.log('Escuché:', transcript);
      console.log('Confianza:', confidence);
      console.log('¿Estamos esperando respuesta?', isWaitingForAnswerRef.current);
      console.log('¿Estamos en login?', location.pathname === '/login');
      
      // Si la confianza es muy baja, ignorar (probablemente ruido)
      if (confidence > 0 && confidence < 0.3) {
        console.log('⚠️ Confianza muy baja, ignorando (probablemente ruido)');
        return;
      }

      // Si estamos en la página de login y estamos esperando respuesta
      if (location.pathname === '/login' && isWaitingForAnswerRef.current) {
        console.log('🔍 Procesando respuesta en login:', transcript);
        console.log('Longitud del transcript:', transcript.length);
        
        // Detectar "sí" o "no" - validación más estricta
        const normalizedTranscript = transcript.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); // Quitar acentos y espacios
        
        // Validación más estricta: debe ser una palabra/frase clara y no muy corta
        // Ignorar si es muy corta (probablemente ruido)
        if (normalizedTranscript.length < 2) {
          console.log('⚠️ Transcript muy corto, ignorando (probablemente ruido)');
          return;
        }
        
        // Verificar que realmente sea una respuesta válida - solo palabras completas
        // Usar expresiones regulares para buscar palabras completas
        const yesPattern = /\b(si|sí|yes|ok|okey|claro|por supuesto|adelante|afirmativo)\b/i;
        const noPattern = /\b(no|nop|cancelar|negativo)\b/i;
        
        const isYes = yesPattern.test(normalizedTranscript);
        const isNo = noPattern.test(normalizedTranscript);
        
        console.log('¿Es SÍ?', isYes);
        console.log('¿Es NO?', isNo);
        
        if (isYes) {
          console.log('✅✅✅ Usuario dijo SÍ claramente, activando reconocimiento facial...');
          // IMPORTANTE: Cambiar el flag ANTES de detener el reconocimiento
          isWaitingForAnswerRef.current = false;
          
          // Detener el reconocimiento de voz inmediatamente
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
              console.log('Reconocimiento de voz detenido');
            } catch (e) {
              console.error('Error al detener reconocimiento:', e);
            }
          }
          
          // Decir "Perfecto, leyendo rostro"
          speak('Perfecto, leyendo rostro');
          
          // Disparar evento para activar reconocimiento facial DESPUÉS de que termine de hablar
          setTimeout(() => {
            console.log('🚀 Disparando evento activateFaceLogin');
            window.dispatchEvent(new CustomEvent('activateFaceLogin'));
          }, 1500); // Esperar a que termine de decir "Perfecto, leyendo rostro"
          
          return; // Salir temprano para no procesar más
        } else if (isNo) {
          console.log('❌ Usuario dijo NO');
          isWaitingForAnswerRef.current = false;
          
          // Detener el reconocimiento de voz
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              console.error('Error al detener reconocimiento:', e);
            }
          }
          
          // Decir "Redirigiendo a la vista normal"
          speak('Redirigiendo a la vista normal');
          
          // Asegurarse de que no haya usuario logueado antes de redirigir
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          
          // Redirigir a /mirror después de que termine de hablar
          setTimeout(() => {
            console.log('Redirigiendo a /mirror sin usuario logueado');
            navigate('/mirror');
          }, 2000);
          
          return; // Salir temprano
        } else {
          // Si no es una respuesta válida, ignorar y continuar escuchando
          console.log('⚠️ No se reconoció una respuesta válida (sí/no), ignorando y continuando escucha...');
          console.log('Transcript recibido:', transcript);
          return; // Continuar escuchando sin hacer nada
        }
      }

      // Detectar comando para salir/logout (solo si estamos en el perfil)
      if (location.pathname === '/mirror') {
        const normalizedTranscript = transcript.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Quitar acentos
        
        // Detectar comando para leer noticias (solo si no está leyendo ya)
        if (!isReadingNewsRef.current && 
            (normalizedTranscript.includes('dime las noticias') || 
             normalizedTranscript.includes('dime las noticia') ||
             normalizedTranscript.includes('lee las noticias') ||
             normalizedTranscript.includes('lee las noticia') ||
             normalizedTranscript.includes('cuéntame las noticias') ||
             normalizedTranscript.includes('cuentame las noticias'))) {
          console.log('Usuario pidió leer las noticias...');
          
          // Marcar que estamos leyendo noticias
          isReadingNewsRef.current = true;
          
          // Detener el reconocimiento temporalmente
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              console.error('Error al detener reconocimiento:', e);
            }
          }
          
          // Obtener y leer las noticias del widget
          fetchNewsAndRead();
          
          return;
        }
        
        if (normalizedTranscript.includes('salir') || 
            normalizedTranscript.includes('cerrar sesion') ||
            normalizedTranscript.includes('cerrar sesión') ||
            normalizedTranscript.includes('logout') ||
            normalizedTranscript.includes('desconectar')) {
          console.log('Usuario pidió salir, ejecutando logout...');
          
          // Detener el reconocimiento
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              console.error('Error al detener reconocimiento:', e);
            }
          }
          
          // Ejecutar logout
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          
          // Disparar evento personalizado para que otros componentes se actualicen
          window.dispatchEvent(new CustomEvent('userLogout'));
          
          // Resetear estados
          hasWelcomedToProfileRef.current = false;
          hasGreetedRef.current = false;
          
          speak('Sesión cerrada. Hasta luego.');
          
          // Reiniciar el reconocimiento después de un momento para el saludo inicial
          setTimeout(() => {
            hasGreetedRef.current = false;
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error('Error al reiniciar reconocimiento:', e);
              }
            }
          }, 3000);
          
          return;
        }
      }

      // Detectar comando para iniciar sesión (solo si no estamos en login)
      if (location.pathname !== '/login' && 
          (transcript.includes('quiero iniciar sesión') || 
           transcript.includes('quiero iniciar sesion') ||
           transcript.includes('iniciar sesión') ||
           transcript.includes('iniciar sesion'))) {
        console.log('Navegando a login...');
        navigate('/login');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Error en reconocimiento de voz:', event.error);
      
      // Errores que no requieren acción (solo continuar escuchando)
      if (event.error === 'no-speech') {
        console.log('No se detectó habla, continuando escucha...');
        return;
      }
      
      // Errores que requieren reiniciar el reconocimiento
      if (event.error === 'aborted' || event.error === 'network' || event.error === 'not-allowed') {
        console.error(`Error crítico en reconocimiento: ${event.error}`);
        
        // Si estamos esperando respuesta en login, intentar reiniciar
        if (location.pathname === '/login' && isWaitingForAnswerRef.current) {
          console.log('Intentando reiniciar reconocimiento después de error...');
          setTimeout(() => {
            if (recognitionRef.current && isWaitingForAnswerRef.current) {
              try {
                recognitionRef.current.start();
                console.log('Reconocimiento reiniciado después de error');
              } catch (e) {
                console.error('Error al reiniciar reconocimiento después de error:', e);
                // Intentar una vez más después de un delay más largo
                setTimeout(() => {
                  if (recognitionRef.current && isWaitingForAnswerRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (e2) {
                      console.error('Error al reintentar reconocimiento:', e2);
                    }
                  }
                }, 2000);
              }
            }
          }, 1000);
        }
        return;
      }
      
      // Para otros errores, intentar reiniciar si estamos esperando respuesta
      if (location.pathname === '/login' && isWaitingForAnswerRef.current) {
        console.log('Reiniciando reconocimiento después de error desconocido...');
        setTimeout(() => {
          if (recognitionRef.current && isWaitingForAnswerRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Error al reiniciar reconocimiento:', e);
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Reconocimiento terminado');
      
      // Reiniciar si:
      // 1. Estamos esperando una respuesta en login (IMPORTANTE: reiniciar siempre en este caso)
      // 2. No hay usuario logueado y ya saludamos
      // 3. Hay usuario logueado y estamos en el perfil (/mirror)
      const user = localStorage.getItem('user');
      const shouldRestart = (isWaitingForAnswerRef.current && location.pathname === '/login') ||
                           (!user && hasGreetedRef.current) ||
                           (user && location.pathname === '/mirror' && hasWelcomedToProfileRef.current);
      
      if (shouldRestart) {
        console.log('Reiniciando reconocimiento...');
        console.log('¿Estamos esperando respuesta?', isWaitingForAnswerRef.current);
        console.log('¿Estamos en login?', location.pathname === '/login');
        
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              // Verificar que aún estamos en el estado correcto antes de reiniciar
              if (location.pathname === '/login' && isWaitingForAnswerRef.current) {
                console.log('✅ Reiniciando reconocimiento en login (esperando respuesta)...');
              }
              recognitionRef.current.start();
            } catch (e: any) {
              console.error('Error al reiniciar reconocimiento:', e);
              // Si el error es porque ya está iniciado, ignorarlo
              if (e.message && e.message.includes('already started')) {
                console.log('Reconocimiento ya estaba iniciado, ignorando error');
                return;
              }
              
              // Para otros errores, intentar de nuevo después de un delay más largo
              if (location.pathname === '/login' && isWaitingForAnswerRef.current) {
                setTimeout(() => {
                  if (recognitionRef.current && isWaitingForAnswerRef.current) {
                    try {
                      console.log('Reintentando iniciar reconocimiento...');
                      recognitionRef.current.start();
                    } catch (e2) {
                      console.error('Error al reintentar reconocimiento:', e2);
                    }
                  }
                }, 1500);
              }
            }
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [navigate, location.pathname]);

  // Función para hablar
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Tu navegador no soporta síntesis de voz');
      return;
    }

    // Cancelar cualquier síntesis anterior
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Intentar usar una voz en español
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(voice => 
      voice.lang.includes('es') || voice.lang.includes('ES')
    );
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      console.log('Terminó de hablar');
    };

    window.speechSynthesis.speak(utterance);
    synthesisRef.current = window.speechSynthesis;
  };

  // Función para obtener y leer las noticias del widget
  const fetchNewsAndRead = async () => {
    try {
      console.log('Obteniendo noticias del widget...');
      speak('Obteniendo las noticias del día');
      
      const response = await fetch('http://localhost:5001/api/news');
      const data = await response.json();
      const articles = (data?.data || []).slice(0, 5); // Obtener las primeras 5 noticias (igual que el widget)
      
      if (articles.length === 0) {
        speak('Lo siento, no pude obtener las noticias en este momento');
        // Resetear el flag y reiniciar el reconocimiento
        setTimeout(() => {
          isReadingNewsRef.current = false;
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Error al reiniciar reconocimiento:', e);
            }
          }
        }, 2000);
        return;
      }
      
      // Esperar a que termine de decir "Obteniendo las noticias del día"
      setTimeout(() => {
        let newsText = 'Aquí están las noticias del día. ';
        
        articles.forEach((article: any, index: number) => {
          const title = article.title || 'Sin título';
          const source = article.source?.name || 'Fuente desconocida';
          newsText += `Noticia ${index + 1}: ${title}. Fuente: ${source}. `;
        });
        
        newsText += 'Eso es todo por ahora.';
        
        console.log('Leyendo noticias:', newsText);
        
        // Crear un utterance para poder detectar cuando termine
        const utterance = new SpeechSynthesisUtterance(newsText);
        utterance.lang = 'es-MX';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Intentar usar una voz en español
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => 
          voice.lang.includes('es') || voice.lang.includes('ES')
        );
        if (spanishVoice) {
          utterance.voice = spanishVoice;
        }
        
        // Cuando termine de leer, resetear el flag y reiniciar el reconocimiento
        utterance.onend = () => {
          console.log('Terminó de leer las noticias');
          isReadingNewsRef.current = false;
          
          // Esperar un momento antes de reiniciar el reconocimiento
          setTimeout(() => {
            if (recognitionRef.current && location.pathname === '/mirror') {
              try {
                console.log('Reiniciando reconocimiento después de leer noticias');
                recognitionRef.current.start();
              } catch (e) {
                console.error('Error al reiniciar reconocimiento:', e);
              }
            }
          }, 1000);
        };
        
        window.speechSynthesis.speak(utterance);
      }, 2000);
      
    } catch (error) {
      console.error('Error al obtener noticias:', error);
      speak('Lo siento, no pude obtener las noticias en este momento');
      // Resetear el flag y reiniciar el reconocimiento
      setTimeout(() => {
        isReadingNewsRef.current = false;
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Error al reiniciar reconocimiento:', e);
          }
        }
      }, 2000);
    }
  };

  // Saludo inicial después de 5 segundos (solo si no hay usuario logueado)
  useEffect(() => {
    // Verificar si hay usuario logueado
    const checkUser = () => {
      const user = localStorage.getItem('user');
      return !user; // Retorna true si NO hay usuario
    };

    const timer = setTimeout(() => {
      // Solo saludar si no hay usuario logueado
      if (!hasGreetedRef.current && checkUser()) {
        hasGreetedRef.current = true;
        speak('Hola, inicia sesión para poder empezar');
        
        // Iniciar el reconocimiento de voz después del saludo
        setTimeout(() => {
          if (recognitionRef.current && checkUser()) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Error al iniciar reconocimiento:', e);
            }
          }
        }, 1000);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Cuando llegamos a la página de login, preguntar si desea iniciar sesión
  useEffect(() => {
    if (location.pathname === '/login' && !hasAskedLoginRef.current) {
      hasAskedLoginRef.current = true;
      // Asegurarse de que NO estamos esperando respuesta inicialmente
      isWaitingForAnswerRef.current = false;
      
      // Detener cualquier reconocimiento activo antes de empezar
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorar errores
        }
      }
      
      console.log('Llegamos a la página de login, preparando pregunta...');
      
      // Esperar un momento para que la página cargue
      const timer = setTimeout(() => {
        console.log('Haciendo pregunta: ¿Deseas iniciar sesión?');
        speak('¿Deseas iniciar sesión?');
        
        // Esperar a que termine de hablar ANTES de activar el reconocimiento
        setTimeout(() => {
          // PRIMERO establecer que estamos esperando respuesta
          isWaitingForAnswerRef.current = true;
          console.log('✅ Ahora estamos esperando respuesta del usuario (isWaitingForAnswer = true)');
          
          // LUEGO esperar un momento adicional antes de iniciar el reconocimiento
          // para asegurar que el flag esté establecido
          setTimeout(() => {
            if (recognitionRef.current && isWaitingForAnswerRef.current) {
              try {
                console.log('Iniciando reconocimiento de voz para escuchar respuesta...');
                recognitionRef.current.start();
                console.log('✅ Reconocimiento iniciado correctamente');
              } catch (e: any) {
                console.error('Error al iniciar reconocimiento en login:', e);
                
                // Si el error es porque ya está iniciado, no hacer nada
                if (e.message && e.message.includes('already started')) {
                  console.log('Reconocimiento ya estaba iniciado, continuando...');
                  return;
                }
                
                // Para otros errores, intentar de nuevo después de un momento
                setTimeout(() => {
                  if (recognitionRef.current && isWaitingForAnswerRef.current) {
                    try {
                      console.log('Reintentando iniciar reconocimiento...');
                      recognitionRef.current.start();
                      console.log('✅ Reconocimiento iniciado en reintento');
                    } catch (e2: any) {
                      console.error('Error al reintentar reconocimiento:', e2);
                      // Último intento después de un delay más largo
                      setTimeout(() => {
                        if (recognitionRef.current && isWaitingForAnswerRef.current) {
                          try {
                            console.log('Último intento de iniciar reconocimiento...');
                            recognitionRef.current.start();
                          } catch (e3) {
                            console.error('Error en último intento:', e3);
                          }
                        }
                      }, 2000);
                    }
                  }
                }, 1000);
              }
            }
          }, 800); // Delay adicional para asegurar que el flag esté establecido
        }, 2000); // Esperar más tiempo a que termine de hablar completamente
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    } else if (location.pathname !== '/login') {
      // Resetear cuando salimos de login
      console.log('Saliendo de login, reseteando estado');
      hasAskedLoginRef.current = false;
      isWaitingForAnswerRef.current = false;
    }
  }, [location.pathname]);

  // Monitorear y mantener activo el reconocimiento cuando estamos esperando respuesta en login
  useEffect(() => {
    if (location.pathname === '/login' && isWaitingForAnswerRef.current) {
      // Verificar periódicamente que el reconocimiento esté activo
      const checkInterval = setInterval(() => {
        if (isWaitingForAnswerRef.current && recognitionRef.current && !isListening) {
          console.log('⚠️ Reconocimiento se detuvo inesperadamente, reiniciando...');
          try {
            recognitionRef.current.start();
            console.log('✅ Reconocimiento reiniciado por monitoreo');
          } catch (e: any) {
            if (e.message && !e.message.includes('already started')) {
              console.error('Error al reiniciar reconocimiento en monitoreo:', e);
            }
          }
        }
      }, 2000); // Verificar cada 2 segundos

      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [location.pathname, isListening]);

  // Cuando el usuario entra a su perfil (/mirror), saludarlo
  useEffect(() => {
    if (location.pathname === '/mirror') {
      const userFromStorage = localStorage.getItem('user');
      
      if (userFromStorage && !hasWelcomedToProfileRef.current) {
        try {
          const user = JSON.parse(userFromStorage);
          const userName = user.name || 'Usuario';
          
          console.log(`Usuario ${userName} entró a su perfil, saludando...`);
          
          // Esperar un momento para que la página cargue completamente
          const timer = setTimeout(() => {
            hasWelcomedToProfileRef.current = true;
            speak(`Bienvenido ${userName}, dime, ¿en qué te puedo ayudar hoy?`);
            
            // Iniciar el reconocimiento después del saludo
            setTimeout(() => {
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.error('Error al iniciar reconocimiento en perfil:', e);
                }
              }
            }, 2000);
          }, 1000);

          return () => {
            clearTimeout(timer);
          };
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
    } else if (location.pathname !== '/mirror') {
      // Resetear cuando salimos del perfil
      hasWelcomedToProfileRef.current = false;
    }
  }, [location.pathname]);

  // Cargar voces disponibles
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  return {
    isListening,
    speak,
  };
}

