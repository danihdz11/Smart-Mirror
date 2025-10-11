// import connectDB from "./config/db.js";
// import { testUsers } from "./tests/testUsers.js";
// connectDB();
// Ejecutar la prueba
//testUsers();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
