import express from "express";
import fetch from "node-fetch";

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    // Verificación básica
    if (!process.env.NEWS_API_KEY) {
      return res.status(500).json({ error: "API key no configurada" });
    }

    const url = `https://api.thenewsapi.com/v1/news/top?api_token=${process.env.NEWS_API_KEY}&locale=mx`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({
        error: `Error API externa: ${response.status}`
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error("Error al obtener noticias:", error);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

export default router;
