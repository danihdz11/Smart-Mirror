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

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Escuchando...');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.toLowerCase().trim();
      console.log('Escuché:', transcript);
      console.log('¿Estamos esperando respuesta?', isWaitingForAnswerRef.current);
      console.log('¿Estamos en login?', location.pathname === '/login');

      // Si estamos en la página de login y estamos esperando respuesta
      if (isWaitingForAnswerRef.current && location.pathname === '/login') {
        // Detectar "sí" o "no" - más variantes
        const normalizedTranscript = transcript.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Quitar acentos
        if (normalizedTranscript.includes('si') || 
            normalizedTranscript.includes('yes') || 
            normalizedTranscript.includes('ok') ||
            normalizedTranscript.includes('okey') ||
            normalizedTranscript.includes('claro') ||
            normalizedTranscript.includes('por supuesto') ||
            normalizedTranscript.includes('adelante')) {
          console.log('✅ Usuario dijo sí, activando reconocimiento facial...');
          isWaitingForAnswerRef.current = false;
          // Detener el reconocimiento temporalmente
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              console.error('Error al detener reconocimiento:', e);
            }
          }
          // Disparar evento para activar reconocimiento facial
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('activateFaceLogin'));
          }, 300);
        } else if (normalizedTranscript.includes('no') || 
                   normalizedTranscript.includes('nop') ||
                   normalizedTranscript.includes('cancelar')) {
          console.log('❌ Usuario dijo no');
          isWaitingForAnswerRef.current = false;
          speak('De acuerdo, cuando estés listo di "quiero iniciar sesión"');
          // Reiniciar el reconocimiento después de un momento
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error('Error al reiniciar reconocimiento:', e);
              }
            }
          }, 2000);
        } else {
          console.log('No se reconoció una respuesta válida, continuando escucha...');
        }
        return;
      }

      // Detectar comando para salir/logout (solo si estamos en el perfil)
      if (location.pathname === '/mirror') {
        const normalizedTranscript = transcript.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Quitar acentos
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
      if (event.error === 'no-speech') {
        // No hacer nada si no hay habla, solo continuar escuchando
        return;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Reconocimiento terminado');
      
      // Reiniciar si:
      // 1. Estamos esperando una respuesta en login
      // 2. No hay usuario logueado y ya saludamos
      // 3. Hay usuario logueado y estamos en el perfil (/mirror)
      const user = localStorage.getItem('user');
      const shouldRestart = (isWaitingForAnswerRef.current && location.pathname === '/login') ||
                           (!user && hasGreetedRef.current) ||
                           (user && location.pathname === '/mirror' && hasWelcomedToProfileRef.current);
      
      if (shouldRestart) {
        console.log('Reiniciando reconocimiento...');
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Error al reiniciar reconocimiento:', e);
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
      isWaitingForAnswerRef.current = false;
      
      console.log('Llegamos a la página de login, preparando pregunta...');
      
      // Esperar un momento para que la página cargue
      const timer = setTimeout(() => {
        console.log('Haciendo pregunta: ¿Deseas iniciar sesión?');
        speak('¿Deseas iniciar sesión?');
        
        // Esperar a que termine de hablar antes de activar el reconocimiento
        setTimeout(() => {
          isWaitingForAnswerRef.current = true;
          console.log('Ahora estamos esperando respuesta del usuario');
          
          // Asegurarse de que el reconocimiento esté activo
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                console.log('Iniciando reconocimiento de voz...');
                recognitionRef.current.start();
              } catch (e) {
                console.error('Error al iniciar reconocimiento en login:', e);
                // Intentar de nuevo después de un momento
                setTimeout(() => {
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (e2) {
                      console.error('Error al reintentar reconocimiento:', e2);
                    }
                  }
                }, 1000);
              }
            }
          }, 500);
        }, 1500); // Esperar a que termine de hablar
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

