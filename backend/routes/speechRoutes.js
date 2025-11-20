import express from "express";
import multer from "multer";
import { transcribeAudio, synthesizeSpeech } from "../controllers/speechController.js";

const router = express.Router();

// Configurar multer para manejar archivos de audio
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    // Aceptar archivos de audio y también archivos sin mimetype (puede pasar con Blobs)
    const allowedMimes = [
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'application/octet-stream',
      'video/webm', // Algunos navegadores envían WebM como video/webm
    ];
    
    // Si no hay mimetype o es uno permitido, aceptar
    if (!file.mimetype || allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/webm')) {
      cb(null, true);
    } else {
      console.warn('Mimetype no permitido:', file.mimetype);
      // Aún así aceptar si es octet-stream o no tiene mimetype
      if (!file.mimetype || file.mimetype === 'application/octet-stream') {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      }
    }
  },
});

// Endpoint para transcribir audio
router.post("/transcribe", upload.single("audio"), transcribeAudio);

// Endpoint para sintetizar texto a voz
router.post("/synthesize", synthesizeSpeech);

export default router;

