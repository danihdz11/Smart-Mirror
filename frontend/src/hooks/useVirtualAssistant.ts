import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const [isListening, setIsListening] = useState(false);
  const hasGreetedRef = useRef(false);

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
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log('Escuché:', transcript);

      // Detectar comando para iniciar sesión
      if (transcript.includes('quiero iniciar sesión') || 
          transcript.includes('quiero iniciar sesion') ||
          transcript.includes('iniciar sesión') ||
          transcript.includes('iniciar sesion')) {
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
      // Reiniciar el reconocimiento si no se detuvo manualmente y no hay usuario logueado
      if (hasGreetedRef.current) {
        const user = localStorage.getItem('user');
        if (!user) {
          try {
            recognition.start();
          } catch (e) {
            // Ignorar errores al reiniciar
          }
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [navigate]);

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

