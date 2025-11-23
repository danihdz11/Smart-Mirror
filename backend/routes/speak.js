// backend/routes/speak.js
import express from "express";
import { exec } from "child_process";

const router = express.Router();

router.post("/", (req, res) => {
  const text = (req.body.text || "").replace(/"/g, '\\"');

  if (!text.trim()) {
    return res.status(400).json({ ok: false, error: "Texto vacío" });
  }

  // 👇 Ajusta esta ruta con lo que te dio `which espeak-ng`
  const espeakPath = "/usr/bin/espeak-ng";

  const cmd = `${espeakPath} -v es-419 -s 135 -p 30 "${text}"`;

  console.log("🗣️ Ejecutando comando TTS:", cmd);

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Error en espeak-ng:", error);
      console.error("STDERR:", stderr);
      return res.status(500).json({ ok: false, error: "espeak-ng failed" });
    }

    console.log("✅ espeak-ng STDOUT:", stdout);
    return res.json({ ok: true });
  });
});

export default router;
