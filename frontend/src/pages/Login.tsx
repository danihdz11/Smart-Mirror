import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithFace } from "../services/api";

export default function Login() {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus("Cámara activa. Posiciona tu rostro frente a la cámara.");
    } catch (err) {
      console.error("Error accediendo a la cámara:", err);
      setError("No se pudo acceder a la cámara. Por favor, permite el acceso a la cámara.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const captureFrame = (): Promise<File | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return Promise.resolve(null);
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0) {
      return Promise.resolve(null);
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return Promise.resolve(null);
    }

    // Dibujar el frame del video en el canvas (sin espejo para procesamiento)
    ctx.drawImage(video, 0, 0, width, height);

    return new Promise<File | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "face.jpg", { type: "image/jpeg" });
            resolve(file);
          } else {
            resolve(null);
          }
        },
        "image/jpeg",
        0.95
      );
    });
  };

  const handleFaceLogin = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setError("");
    setStatus("Reconociendo tu rostro...");

    try {
      const imageFile = await captureFrame();
      if (!imageFile) {
        setError("No se pudo capturar la imagen. Intenta de nuevo.");
        setIsScanning(false);
        return;
      }

      const response = await loginWithFace(imageFile);

      if (response.token && response.user) {
        // Guardar token y datos del usuario
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        setStatus(`¡Bienvenido, ${response.user.name}!`);
        
        // Redirigir al mirror view después de un breve delay
        setTimeout(() => {
          navigate("/mirror", { state: { userName: response.user.name } });
        }, 1500);
      }
    } catch (err: any) {
      console.error("Error en reconocimiento facial:", err);
      const errorMessage = err.response?.data?.message || "No se pudo reconocer tu rostro. Intenta de nuevo.";
      setError(errorMessage);
      setStatus("");
      setIsScanning(false);
    }
  }, [isScanning, navigate]);

  // Escuchar evento para activar reconocimiento facial automáticamente
  useEffect(() => {
    console.log('Login: Configurando listener para activateFaceLogin');
    
    const handleActivateFaceLogin = () => {
      console.log('✅ Login: Evento activateFaceLogin recibido, activando reconocimiento facial...');
      // Esperar un momento para asegurar que la cámara esté lista
      setTimeout(() => {
        console.log('Login: Ejecutando handleFaceLogin...');
        handleFaceLogin();
      }, 500);
    };

    window.addEventListener('activateFaceLogin', handleActivateFaceLogin);
    console.log('Login: Listener agregado correctamente');

    return () => {
      console.log('Login: Removiendo listener');
      window.removeEventListener('activateFaceLogin', handleActivateFaceLogin);
    };
  }, [handleFaceLogin]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Iniciar sesión
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Reconocimiento facial
        </p>

        <div className="relative mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg border-2 border-gray-300 [transform:scaleX(-1)]"
            style={{ maxHeight: "400px", objectFit: "cover" }}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {status && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600/90 text-white px-4 py-2 rounded-lg text-sm">
              {status}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            onClick={handleFaceLogin}
            disabled={isScanning}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              isScanning
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isScanning ? "Reconociendo..." : "Iniciar sesión con reconocimiento facial"}
          </button>

          <button
            onClick={startCamera}
            className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Reiniciar cámara
          </button>
        </div>
      </div>
    </div>
  );
}
