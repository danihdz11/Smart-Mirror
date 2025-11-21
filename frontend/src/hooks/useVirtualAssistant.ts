import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transcribeAudio, synthesizeSpeech } from '../services/api';
import { useMirrorCommands } from './useMirrorCommands';

export function useVirtualAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const [isListening, setIsListening] = useState(false);
  const hasGreetedRef = useRef(false);
  const hasAskedLoginRef = useRef(false);
  const isWaitingForAnswerRef = useRef(false);
  const isProcessingRef = useRef(false);
  const recordingIntervalRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const processLoggedInCommandRef = useRef<((transcript: string) => boolean) | null>(null);
  const isReadingNewsRef = useRef(false);
  const hasWelcomedToProfileRef = useRef(false);

  // Función para procesar el transcript
  const processTranscript = (transcript: string, confidence: number = 1.0) => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    console.log('Escuché:', normalizedTranscript);
    console.log('Confianza:', confidence);
    console.log('¿Estamos esperando respuesta?', isWaitingForAnswerRef.current);
    console.log('¿Estamos en login?', location.pathname === '/login');
    console.log('📍 location.pathname actual:', location.pathname);
    
    // Si la confianza es muy baja, ignorar (probablemente ruido)
    if (confidence > 0 && confidence < 0.3) {
      console.log('⚠️ Confianza muy baja, ignorando (probablemente ruido)');
      return;
    }

    // Si estamos esperando respuesta (esto solo se activa en login)
    // Usamos el flag como indicador principal ya que es más confiable que location.pathname
    if (isWaitingForAnswerRef.current) {
      console.log('🔍 Procesando respuesta en login:', normalizedTranscript);
      console.log('Longitud del transcript:', normalizedTranscript.length);
      
      // Normalizar el transcript: quitar acentos y convertir a minúsculas
      const normalized = normalizedTranscript.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      
      // Validación: debe ser una palabra/frase clara y no muy corta
      if (normalized.length < 1) {
        console.log('⚠️ Transcript muy corto, ignorando (probablemente ruido)');
        return;
      }
      
      // Variantes de "SÍ" - más flexibles y sin depender de acentos
      const yesPatterns = [
        'si',           // sin acento
        'sí',           // con acento (por si acaso)
        'yes',
        'ok',
        'okey',
        'okay',
        'claro',
        'por supuesto',
        'adelante',
        'afirmativo',
        'correcto',
        'de acuerdo',
        'vale',
        'bueno',
        'perfecto',
        'dale',
        'procede',
        'continua',
        'sigue',
        'leer rostro',
        'leer cara',
        'reconocer',
        'reconocimiento facial',
        'si quiero',
        'si deseo',
        'quiero iniciar',
        'quiero entrar'
      ];
      
      // Variantes de "NO"
      const noPatterns = [
        'no',
        'nop',
        'cancelar',
        'negativo',
        'no quiero',
        'no deseo',
        'salir',
        'volver',
        'atras'
      ];
      
      // Verificar si coincide con algún patrón de "SÍ"
      const isYes = yesPatterns.some(pattern => {
        const normalizedPattern = pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        // Buscar como palabra completa o como parte del texto
        return normalized.includes(normalizedPattern) || 
               normalized.split(/\s+/).some(word => word === normalizedPattern);
      });
      
      // Verificar si coincide con algún patrón de "NO"
      const isNo = noPatterns.some(pattern => {
        const normalizedPattern = pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return normalized.includes(normalizedPattern) || 
               normalized.split(/\s+/).some(word => word === normalizedPattern);
      });
      
      console.log('Transcript normalizado:', normalized);
      console.log('¿Es SÍ?', isYes);
      console.log('¿Es NO?', isNo);
      
      if (isYes) {
        console.log('✅✅✅ Usuario dijo SÍ claramente, activando reconocimiento facial...');
        
        // Verificar que realmente estamos esperando respuesta antes de activar
        if (!isWaitingForAnswerRef.current) {
          console.log('⚠️ No estábamos esperando respuesta, ignorando...');
          return;
        }
        
        // Desactivar el flag inmediatamente para evitar múltiples activaciones
        isWaitingForAnswerRef.current = false;
        
        stopListening();
        
        speak('Perfecto, leyendo tu rostro');
        
        // Esperar a que termine de hablar antes de activar el reconocimiento facial
        setTimeout(() => {
          console.log('🚀 Disparando evento activateFaceLogin');
          window.dispatchEvent(new CustomEvent('activateFaceLogin'));
        }, 2000); // Aumentar el tiempo para asegurar que termine de hablar
        
        return;
      } else if (isNo) {
        console.log('❌ Usuario dijo NO');
        isWaitingForAnswerRef.current = false;
        
        stopListening();
        
        speak('Redirigiendo a la vista normal');
        
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        setTimeout(() => {
          console.log('Redirigiendo a /mirror sin usuario logueado');
          navigate('/mirror');
        }, 2000);
        
        return;
      } else {
        console.log('⚠️ No se reconoció una respuesta válida (sí/no), ignorando y continuando escucha...');
        console.log('Transcript recibido:', normalizedTranscript);
        console.log('Transcript normalizado:', normalized);
        return;
      }
    }

    // Procesar comandos cuando el usuario está logueado (delegar al hook useMirrorCommands)
    if (processLoggedInCommandRef.current) {
      if (processLoggedInCommandRef.current(transcript)) {
        return; // El comando fue procesado, no continuar
      }
    }

    // Detectar comando para iniciar sesión
    // Normalizar el transcript para quitar acentos y hacer la búsqueda más flexible
    const normalizedForLogin = normalizedTranscript.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (location.pathname !== '/login') {
      // Variantes del comando "iniciar sesión"
      const loginPatterns = [
        'quiero iniciar sesion',
        'quiero iniciar sesión',
        'iniciar sesion',
        'iniciar sesión',
        'inicia sesion',
        'inicia sesión',
        'quiero iniciar',
        'iniciar',
        'login',
        'loguear',
        'loguearme'
      ];
      
      const matchesLogin = loginPatterns.some(pattern => {
        const normalizedPattern = pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalizedForLogin.includes(normalizedPattern);
      });
      
      if (matchesLogin) {
        console.log('✅ Comando detectado: iniciar sesión');
        console.log('Navegando a login...');
        stopListening(); // Detener el reconocimiento antes de navegar
        navigate('/login');
        return; // Salir para no procesar más comandos
      }
    }
  };

  // Función para iniciar la grabación de audio
  const startListening = async () => {
    if (isProcessingRef.current || isListening) {
      return;
    }

    try {
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      audioStreamRef.current = stream;
      
      // Fallback si webm no está disponible
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else {
          mimeType = 'audio/webm'; // Intentar de todas formas
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        if (audioChunks.length === 0) {
          setIsListening(false);
          isProcessingRef.current = false;
          return;
        }
        
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        
        // Validar que el blob tenga un tamaño mínimo (al menos 1KB)
        if (audioBlob.size < 1024) {
          console.log('Audio demasiado pequeño, ignorando:', audioBlob.size, 'bytes');
          setIsListening(false);
          isProcessingRef.current = false;
          return;
        }
        
        // Procesar el audio
        try {
          isProcessingRef.current = true;
          console.log('Enviando audio para transcripción, tamaño:', audioBlob.size, 'bytes');
          const result = await transcribeAudio(audioBlob, 'es-MX');
          
          if (result.transcript) {
            processTranscript(result.transcript, result.confidence);
          }
        } catch (error: any) {
          console.error('Error al transcribir audio:', error);
          // Mostrar más detalles del error
          if (error.response) {
            console.error('Error del servidor:', error.response.status, error.response.data);
          }
        } finally {
          isProcessingRef.current = false;
          setIsListening(false);
          
          // Reiniciar grabación si es necesario
          const user = localStorage.getItem('user');
          const shouldRestart = (isWaitingForAnswerRef.current && location.pathname === '/login') ||
                               (!user && hasGreetedRef.current) ||
                               (user && location.pathname === '/mirror' && hasWelcomedToProfileRef.current);
          
          if (shouldRestart) {
            setTimeout(() => {
              startListening();
            }, 500);
          }
        }
      };
      
      // Iniciar grabación
      mediaRecorder.start();
      setIsListening(true);
      console.log('Escuchando...');
      
      // Grabar en chunks de 3 segundos y procesar
      recordingIntervalRef.current = window.setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          
          // Reiniciar inmediatamente para continuar escuchando
          setTimeout(() => {
            if (mediaRecorderRef.current && audioStreamRef.current) {
              const newRecorder = new MediaRecorder(audioStreamRef.current, { mimeType });
              mediaRecorderRef.current = newRecorder;
              
              const newChunks: Blob[] = [];
              newRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  newChunks.push(event.data);
                }
              };
              
              newRecorder.onstop = async () => {
                if (newChunks.length === 0) {
                  setIsListening(false);
                  isProcessingRef.current = false;
                  return;
                }
                
                const audioBlob = new Blob(newChunks, { type: mimeType });
                
                // Validar que el blob tenga un tamaño mínimo (al menos 1KB)
                if (audioBlob.size < 1024) {
                  console.log('Audio demasiado pequeño, ignorando:', audioBlob.size, 'bytes');
                  setIsListening(false);
                  isProcessingRef.current = false;
                  return;
                }
                
                try {
                  isProcessingRef.current = true;
                  console.log('Enviando audio para transcripción, tamaño:', audioBlob.size, 'bytes');
                  const result = await transcribeAudio(audioBlob, 'es-MX');
                  
                  if (result.transcript) {
                    processTranscript(result.transcript, result.confidence);
                  }
                } catch (error: any) {
                  console.error('Error al transcribir audio:', error);
                  // Mostrar más detalles del error
                  if (error.response) {
                    console.error('Error del servidor:', error.response.status, error.response.data);
                  }
                } finally {
                  isProcessingRef.current = false;
                  setIsListening(false);
                  
                  // Reiniciar si es necesario
                  const user = localStorage.getItem('user');
                  const shouldRestart = (isWaitingForAnswerRef.current && location.pathname === '/login') ||
                                       (!user && hasGreetedRef.current) ||
                                       (user && location.pathname === '/mirror' && hasWelcomedToProfileRef.current);
                  
                  if (shouldRestart) {
                    setTimeout(() => {
                      startListening();
                    }, 500);
                  }
                }
              };
              
              newRecorder.start();
              setIsListening(true);
            }
          }, 100);
        }
      }, 3000); // Grabar cada 3 segundos
      
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      setIsListening(false);
      isProcessingRef.current = false;
    }
  };

  // Función para detener la grabación
  const stopListening = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error al detener grabación:', e);
      }
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    setIsListening(false);
    isProcessingRef.current = false;
  };

  // Función para hablar usando el backend (más confiable en Raspberry Pi)
  const speak = async (text: string): Promise<void> => {
    if (!text || text.trim().length === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      (async () => {
        try {
          // Intentar primero con el backend (usa el sistema de audio del OS, igual que YouTube)
          console.log('Generando audio con backend TTS...');
          const audioBlob = await synthesizeSpeech(text, 'es');
          
          // Crear URL del blob y reproducirlo
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          audio.onended = () => {
            console.log('Terminó de hablar');
            // Liberar la URL del blob después de reproducir
            URL.revokeObjectURL(audioUrl);
            resolve();
            
            // Reiniciar listening automáticamente si estamos en /mirror y logueados
            // (excepto si estamos leyendo noticias o esperando respuesta en login)
            const user = localStorage.getItem('user');
            if (user && location.pathname === '/mirror' && 
                !isReadingNewsRef.current && 
                !isProcessingRef.current &&
                !isWaitingForAnswerRef.current) {
              setTimeout(() => {
                console.log('Reiniciando listening después de hablar...');
                startListening();
              }, 500);
            }
          };
          
          audio.onerror = (error) => {
            console.error('Error al reproducir audio:', error);
            URL.revokeObjectURL(audioUrl);
            // Fallback a speechSynthesis si falla
            fallbackToSpeechSynthesisWithCallback(text, resolve);
          };
          
          // Reproducir el audio
          await audio.play();
          
        } catch (error) {
          console.error('Error al generar audio con backend, usando fallback:', error);
          // Fallback a speechSynthesis si el backend falla
          fallbackToSpeechSynthesisWithCallback(text, resolve);
        }
      })();
    });
  };

  // Fallback a speechSynthesis del navegador (por si el backend falla)
  const fallbackToSpeechSynthesisWithCallback = (text: string, callback?: () => void) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Tu navegador no soporta síntesis de voz y el backend falló');
      if (callback) callback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(voice => 
      voice.lang.includes('es') || voice.lang.includes('ES')
    );
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      console.log('Terminó de hablar (usando fallback)');
      if (callback) callback();
      
      // Reiniciar listening automáticamente si estamos en /mirror y logueados
      // (excepto si estamos leyendo noticias o esperando respuesta en login)
      const user = localStorage.getItem('user');
      if (user && location.pathname === '/mirror' && 
          !isReadingNewsRef.current && 
          !isProcessingRef.current &&
          !isWaitingForAnswerRef.current) {
        setTimeout(() => {
          console.log('Reiniciando listening después de hablar (fallback)...');
          startListening();
        }, 500);
      }
    };

    window.speechSynthesis.speak(utterance);
    synthesisRef.current = window.speechSynthesis;
  };

  // Inicializar el hook de comandos para usuarios logueados
  // Esto debe estar después de definir speak, startListening y stopListening
  const mirrorCommands = useMirrorCommands({
    speak,
    startListening,
    stopListening,
    isProcessingRef,
  });

  // Actualizar las referencias para usar en otras partes del código
  // Nota: Estas referencias se actualizan en cada render para mantener la sincronización
  processLoggedInCommandRef.current = mirrorCommands.processLoggedInCommand;
  
  // Sincronizar las referencias compartidas en cada render
  // Esto asegura que las referencias locales estén actualizadas cuando se usen en las funciones
  isReadingNewsRef.current = mirrorCommands.isReadingNewsRef.current;
  hasWelcomedToProfileRef.current = mirrorCommands.hasWelcomedToProfileRef.current;

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Saludo inicial después de 5 segundos
  useEffect(() => {
    const checkUser = () => {
      const user = localStorage.getItem('user');
      return !user;
    };

    const timer = setTimeout(() => {
      if (!hasGreetedRef.current && checkUser()) {
        hasGreetedRef.current = true;
        speak('Hola, inicia sesión para poder empezar');
        
        setTimeout(() => {
          if (checkUser()) {
            startListening();
          }
        }, 1000);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Cuando llegamos a la página de login
  useEffect(() => {
    if (location.pathname === '/login' && !hasAskedLoginRef.current) {
      hasAskedLoginRef.current = true;
      isWaitingForAnswerRef.current = false;
      
      stopListening();
      
      console.log('Llegamos a la página de login, preparando pregunta...');
      
      const timer = setTimeout(async () => {
        console.log('Haciendo pregunta: ¿Deseas iniciar sesión?');
        
        // Esperar a que termine de hablar antes de activar el listening
        await speak('¿Deseas iniciar sesión? Responde sí para leer tu rostro, o no para continuar sin iniciar sesión');
        
        // Solo después de que termine de hablar, activar el flag y empezar a escuchar
        isWaitingForAnswerRef.current = true;
        console.log('✅ Ahora estamos esperando respuesta del usuario');
        
        // Esperar un momento adicional antes de empezar a escuchar
        setTimeout(() => {
          if (isWaitingForAnswerRef.current && location.pathname === '/login') {
            console.log('🎤 Iniciando listening para recibir respuesta...');
            startListening();
          }
        }, 1000);
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    } else if (location.pathname !== '/login') {
      hasAskedLoginRef.current = false;
      isWaitingForAnswerRef.current = false;
    }
  }, [location.pathname]);

  // El saludo de bienvenida cuando el usuario entra a su perfil ahora se maneja en useMirrorCommands

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
