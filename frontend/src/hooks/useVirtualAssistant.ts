import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { transcribeAudio, synthesizeSpeech } from "../services/api";
import {
  handleVoiceCommands,
  type CommandContext,
} from "./voice/voiceCommands";

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
  const hasWelcomedToProfileRef = useRef(false);
  const isReadingNewsRef = useRef(false);
  const isProcessingRef = useRef(false);

  const recordingIntervalRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);

  // =====================================================
  //  Helpers para flags
  // =====================================================
  const resetWelcomeFlags = () => {
    hasWelcomedToProfileRef.current = false;
    hasGreetedRef.current = false;
  };

  // =====================================================
  //  Procesar transcript
  // =====================================================
  const processTranscript = (transcript: string, confidence: number = 1.0) => {
    const normalizedTranscript = transcript.toLowerCase().trim();

    console.log("Escuché:", normalizedTranscript);
    console.log("Confianza:", confidence);
    console.log(
      "¿Estamos esperando respuesta?",
      isWaitingForAnswerRef.current
    );
    console.log("¿Estamos en login?", location.pathname === "/login");

    if (confidence > 0 && confidence < 0.3) {
      console.log("⚠️ Confianza muy baja, ignorando (probablemente ruido)");
      return;
    }

    // ===========================
    // 1) LÓGICA ESPECIAL EN /login (sí/no)
    // ===========================
    if (location.pathname === "/login" && isWaitingForAnswerRef.current) {
      console.log("🔍 Procesando respuesta en login:", normalizedTranscript);
      console.log("Longitud del transcript:", normalizedTranscript.length);

      const normalized = normalizedTranscript
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

      if (normalized.length < 1) {
        console.log("⚠️ Transcript muy corto, ignorando (probablemente ruido)");
        return;
      }

      const yesPatterns = [
        "si",
        "sí",
        "yes",
        "ok",
        "okey",
        "okay",
        "claro",
        "por supuesto",
        "adelante",
        "afirmativo",
        "correcto",
        "de acuerdo",
        "vale",
        "bueno",
        "perfecto",
        "dale",
        "procede",
        "continua",
        "sigue",
        "leer rostro",
        "leer cara",
        "reconocer",
        "reconocimiento facial",
        "si quiero",
        "si deseo",
        "quiero iniciar",
        "quiero entrar",
      ];

      const noPatterns = [
        "no",
        "nop",
        "cancelar",
        "negativo",
        "no quiero",
        "no deseo",
        "salir",
        "volver",
        "atras",
      ];

      const isYes = yesPatterns.some((pattern) => {
        const normalizedPattern = pattern
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return (
          normalized.includes(normalizedPattern) ||
          normalized.split(/\s+/).some((word) => word === normalizedPattern)
        );
      });

      const isNo = noPatterns.some((pattern) => {
        const normalizedPattern = pattern
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return (
          normalized.includes(normalizedPattern) ||
          normalized.split(/\s+/).some((word) => word === normalizedPattern)
        );
      });

      console.log("Transcript normalizado:", normalized);
      console.log("¿Es SÍ?", isYes);
      console.log("¿Es NO?", isNo);

      if (isYes) {
        console.log(
          "✅✅✅ Usuario dijo SÍ claramente, activando reconocimiento facial..."
        );
        isWaitingForAnswerRef.current = false;
        stopListening();
        speak("Perfecto, leyendo tu rostro");

        setTimeout(() => {
          console.log("🚀 Disparando evento activateFaceLogin");
          window.dispatchEvent(new CustomEvent("activateFaceLogin"));
        }, 1500);

        return;
      } else if (isNo) {
        console.log("❌ Usuario dijo NO");
        isWaitingForAnswerRef.current = false;

        stopListening();
        speak("Redirigiendo a la vista normal");

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        setTimeout(() => {
          console.log("Redirigiendo a /mirror sin usuario logueado");
          navigate("/mirror");
        }, 2000);

        return;
      } else {
        console.log(
          "⚠️ No se reconoció una respuesta válida (sí/no), ignorando y continuando escucha..."
        );
        console.log("Transcript recibido:", normalizedTranscript);
        console.log("Transcript normalizado:", normalized);
        return;
      }
    }

    // ===========================
    // 2) DELEGAR A ARCHIVO DE COMANDOS
    // ===========================
    const ctx: CommandContext = {
      locationPath: location.pathname,
      speak,
      navigate,
      stopListening,
      startListening,
      fetchNewsAndRead,
      resetWelcomeFlags,
    };

    const handled = handleVoiceCommands(normalizedTranscript, ctx);

    if (handled) {
      // Algún comando se encargó del transcript
      return;
    }

    // ===========================
    // 3) (Opcional) Lógica extra local
    // ===========================
    // Aquí podrías agregar lógica muy específica que NO quieras
    // mover al archivo externo.
  };

  // =====================================================
  //  Inicio de escucha
  // =====================================================
  const startListening = async () => {
    console.log(
      "👉 startListening llamado. isProcessing:",
      isProcessingRef.current,
      "isListening:",
      isListening
    );

    if (isProcessingRef.current || isListening) {
      console.log(
        "⛔ startListening abortado porque ya está procesando o escuchando"
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else {
          mimeType = "audio/webm";
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

        if (audioBlob.size < 1024) {
          console.log(
            "Audio demasiado pequeño, ignorando:",
            audioBlob.size,
            "bytes"
          );
          setIsListening(false);
          isProcessingRef.current = false;
          return;
        }

        try {
          isProcessingRef.current = true;
          console.log(
            "Enviando audio para transcripción, tamaño:",
            audioBlob.size,
            "bytes"
          );
          const result = await transcribeAudio(audioBlob, "es-MX");

          if (result.transcript) {
            processTranscript(result.transcript, result.confidence);
          }
        } catch (error: any) {
          console.error("Error al transcribir audio:", error);
          if (error.response) {
            console.error(
              "Error del servidor:",
              error.response.status,
              error.response.data
            );
          }
        } finally {
          isProcessingRef.current = false;
          setIsListening(false);

          const user = localStorage.getItem("user");
          const shouldRestart =
            (isWaitingForAnswerRef.current &&
              location.pathname === "/login") ||
            (!user && hasGreetedRef.current) ||
            (user &&
              location.pathname === "/mirror" &&
              hasWelcomedToProfileRef.current);

          if (shouldRestart) {
            setTimeout(() => {
              startListening();
            }, 500);
          }
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      console.log("Escuchando...");

      recordingIntervalRef.current = window.setInterval(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();

          setTimeout(() => {
            if (mediaRecorderRef.current && audioStreamRef.current) {
              const newRecorder = new MediaRecorder(audioStreamRef.current, {
                mimeType,
              });
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

                if (audioBlob.size < 1024) {
                  console.log(
                    "Audio demasiado pequeño, ignorando:",
                    audioBlob.size,
                    "bytes"
                  );
                  setIsListening(false);
                  isProcessingRef.current = false;
                  return;
                }

                try {
                  isProcessingRef.current = true;
                  console.log(
                    "Enviando audio para transcripción, tamaño:",
                    audioBlob.size,
                    "bytes"
                  );
                  const result = await transcribeAudio(audioBlob, "es-MX");

                  if (result.transcript) {
                    processTranscript(result.transcript, result.confidence);
                  }
                } catch (error: any) {
                  console.error("Error al transcribir audio:", error);
                  if (error.response) {
                    console.error(
                      "Error del servidor:",
                      error.response.status,
                      error.response.data
                    );
                  }
                } finally {
                  isProcessingRef.current = false;
                  setIsListening(false);

                  const user = localStorage.getItem("user");
                  const shouldRestart =
                    (isWaitingForAnswerRef.current &&
                      location.pathname === "/login") ||
                    (!user && hasGreetedRef.current) ||
                    (user &&
                      location.pathname === "/mirror" &&
                      hasWelcomedToProfileRef.current);

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
      }, 3000);
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      setIsListening(false);
      isProcessingRef.current = false;
    }
  };

  // =====================================================
  //  Detener escucha
  // =====================================================
  const stopListening = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error al detener grabación:", e);
      }
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    setIsListening(false);
    isProcessingRef.current = false;
  };

  // =====================================================
  //  Hablar usando backend TTS (+ fallback)
  // =====================================================
  const speak = async (text: string): Promise<void> => {
    if (!text || text.trim().length === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      (async () => {
        try {
          console.log("Generando audio con backend TTS...");
          const audioBlob = await synthesizeSpeech(text, "es");

          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          audio.onended = () => {
            console.log("Terminó de hablar");
            URL.revokeObjectURL(audioUrl);
            resolve();
          };

          audio.onerror = (error) => {
            console.error("Error al reproducir audio:", error);
            URL.revokeObjectURL(audioUrl);
            fallbackToSpeechSynthesisWithCallback(text, resolve);
          };

          await audio.play();
        } catch (error) {
          console.error(
            "Error al generar audio con backend, usando fallback:",
            error
          );
          fallbackToSpeechSynthesisWithCallback(text, resolve);
        }
      })();
    });
  };

  const fallbackToSpeechSynthesisWithCallback = (
    text: string,
    callback?: () => void
  ) => {
    if (!("speechSynthesis" in window)) {
      console.warn(
        "Tu navegador no soporta síntesis de voz y el backend falló"
      );
      if (callback) callback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(
      (voice) => voice.lang.includes("es") || voice.lang.includes("ES")
    );
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      console.log("Terminó de hablar (usando fallback)");
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
    synthesisRef.current = window.speechSynthesis;
  };

  // =====================================================
  //  Noticias (ahora se auto-protege con isReadingNewsRef)
  // =====================================================
  const fetchNewsAndRead = async () => {
    if (isReadingNewsRef.current) {
      console.log("📰 Ya estoy leyendo noticias, ignoro nueva petición");
      return;
    }

    isReadingNewsRef.current = true;

    try {
      console.log("Obteniendo noticias del widget...");
      speak("Obteniendo las noticias del día");

      const response = await fetch("http://localhost:5001/api/news");
      const data = await response.json();
      const articles = (data?.data || []).slice(0, 5);

      if (articles.length === 0) {
        speak("Lo siento, no pude obtener las noticias en este momento");
        setTimeout(() => {
          isReadingNewsRef.current = false;
          startListening();
        }, 2000);
        return;
      }

      setTimeout(async () => {
        let newsText = "Aquí están las noticias del día. ";

        articles.forEach((article: any, index: number) => {
          const title = article.title || "Sin título";
          const source = article.source?.name || "Fuente desconocida";
          newsText += `Noticia ${index + 1}: ${title}. Fuente: ${source}. `;
        });

        newsText += "Eso es todo por ahora.";

        console.log("Leyendo noticias:", newsText);

        await speak(newsText);

        console.log("Terminó de leer las noticias");
        isReadingNewsRef.current = false;

        setTimeout(() => {
          if (location.pathname === "/mirror") {
            startListening();
          }
        }, 1000);
      }, 2000);
    } catch (error) {
      console.error("Error al obtener noticias:", error);
      speak("Lo siento, no pude obtener las noticias en este momento");
      setTimeout(() => {
        isReadingNewsRef.current = false;
        startListening();
      }, 2000);
    }
  };

  // =====================================================
  //  Limpieza al desmontar
  // =====================================================
  useEffect(() => {
    return () => {
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  //  Saludo inicial en home (sin usuario)
  // =====================================================
  useEffect(() => {
    const checkUser = () => {
      const user = localStorage.getItem("user");
      return !user;
    };

    const timer = setTimeout(() => {
      if (!hasGreetedRef.current && checkUser()) {
        hasGreetedRef.current = true;
        speak("a");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  //  Pregunta en /login
  // =====================================================
  useEffect(() => {
    if (location.pathname === "/login" && !hasAskedLoginRef.current) {
      hasAskedLoginRef.current = true;
      isWaitingForAnswerRef.current = false;

      stopListening();

      console.log("Llegamos a la página de login, preparando pregunta...");

      const timer = setTimeout(() => {
        console.log("Haciendo pregunta: ¿Deseas iniciar sesión?");
        speak(
          "¿Deseas iniciar sesión? Responde si en ingles o claro para leer tu rostro, o no para continuar sin iniciar sesión"
        );

        setTimeout(() => {
          isWaitingForAnswerRef.current = true;
          console.log("✅ Ahora estamos esperando respuesta del usuario");

          setTimeout(() => {
            if (isWaitingForAnswerRef.current) {
              startListening();
            }
          }, 4000);
        }, 2000);
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    } else if (location.pathname !== "/login") {
      hasAskedLoginRef.current = false;
      isWaitingForAnswerRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // =====================================================
  //  Saludo al entrar a /mirror
  // =====================================================
  useEffect(() => {
    if (location.pathname === "/mirror") {
      const userFromStorage = localStorage.getItem("user");

      if (userFromStorage && !hasWelcomedToProfileRef.current) {
        try {
          const user = JSON.parse(userFromStorage);
          const userName = user.name || "Usuario";

          console.log(
            `Usuario ${userName} entró a su perfil, saludando...`
          );

          stopListening();
          hasWelcomedToProfileRef.current = true;
          let cancelled = false;

          (async () => {
            try {
              await new Promise((res) => setTimeout(res, 1000));
              await speak(
                `Bienvenido ${userName}, dime, ¿en qué te puedo ayudar hoy?`
              );
              if (!cancelled) {
                console.log("Saludo terminado, comenzando a escuchar...");
                startListening();
              }
            } catch (e) {
              console.error("Error durante el saludo de perfil:", e);
              if (!cancelled) {
                startListening();
              }
            }
          })();

          return () => {
            cancelled = true;
          };
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }
      }
    } else if (location.pathname !== "/mirror") {
      hasWelcomedToProfileRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // =====================================================
  //  Cargar voces disponibles
  // =====================================================
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    if ("onvoiceschanged" in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  return {
    isListening,
    speak,
  };
}
