import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();


import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";

const app = express();

// 🔌 Conectar a la base de datos
connectDB();

// 🧩 Middlewares
app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// 🗞️ Rutas
app.use("/api/news", newsRoutes);
app.use("/api/auth", authRoutes);

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);
