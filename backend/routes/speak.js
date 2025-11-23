import express from "express";
import { exec } from "child_process";

const router = express.Router();

router.post("/", (req, res) => {
  const text = (req.body.text || "").replace(/"/g, '\\"');

  if (!text.trim()) {
    return res.status(400).json({ ok: false, error: "Texto vacío" });
  }

  // Usa español de México (ajustable)
  const cmd = `espeak-ng -v es-mx "${text}"`;

  exec(cmd, (error) => {
    if (error) {
      console.error("Error en espeak-ng:", error);
      return res.status(500).json({ ok: false });
    }
    return res.json({ ok: true });
  });
});

export default router;
