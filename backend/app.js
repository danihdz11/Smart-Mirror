import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();


import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";

const app = express();

// 🔌 Conectar a la base de datos
connectDB();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type"],
    credentials: false,
    optionsSuccessStatus: 204
  })
);
app.use(express.json());

// 🗞️ Rutas
app.use("/api/news", newsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/weather", weatherRoutes);

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);
