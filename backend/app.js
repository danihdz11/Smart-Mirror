import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import speechRoutes from "./routes/speechRoutes.js";
import speakRoute from "./routes/speak.js"; // 👈 NUEVA RUTA

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type"],
    credentials: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());

// 🔌 Conectar a la base de datos
connectDB();

// 🗞️ Rutas
app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/speech", speechRoutes);

// 🔊 Ruta para espeak-ng
app.use("/api/speak", speakRoute);

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);
