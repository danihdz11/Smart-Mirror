// cleanDB.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const cleanDatabase = async () => {
  try {
    // Conectarse a la base
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    // Eliminar todos los usuarios
    const result = await User.deleteMany({});
    console.log(`🧹 Usuarios eliminados: ${result.deletedCount}`);

    // Cerrar conexión
    await mongoose.disconnect();
    console.log("🔌 Conexión cerrada. Base limpia.");
  } catch (error) {
    console.error("❌ Error al limpiar la base de datos:", error.message);
    process.exit(1);
  }
};

// Ejecutar cuando se corre el script
cleanDatabase();
