import express from "express";
import { exec } from "child_process";

const router = express.Router();

router.post("/", (req, res) => {
  const text = (req.body.text || "").replace(/"/g, '\\"');

  console.log("[/api/speak] Texto recibido:", text);

  if (!text.trim()) {
    return res.status(400).json({ ok: false, error: "Texto vacío" });
  }

  // Usa español; puedes cambiar a es-mx si quieres
  const cmd = `espeak-ng -v es "${text}"`;

  console.log("[/api/speak] Ejecutando:", cmd);

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error("Error en espeak-ng:", error, stderr);
      return res.status(500).json({ ok: false, error: "espeak-ng fallo" });
    }

    console.log("espeak-ng OK:", stdout);
    return res.json({ ok: true });
  });
});

export default router;
