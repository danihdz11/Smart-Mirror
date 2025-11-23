// backend/routes/speak.js
import express from "express";
import { exec } from "child_process";

const router = express.Router();

router.post("/", (req, res) => {
  const text = (req.body.text || "").replace(/"/g, '\\"');

  if (!text.trim()) {
    return res.status(400).json({ ok: false, error: "Texto vacío" });
  }

  // Voz grave latinoamericana: es-419, velocidad 135, pitch 30
  const cmd = `espeak-ng -v es-419 -s 135 -p 30 "${text}"`;

  exec(cmd, (error) => {
    if (error) {
      console.error("Error en espeak-ng:", error);
      return res.status(500).json({ ok: false });
    }
    return res.json({ ok: true });
  });
});

export default router;
