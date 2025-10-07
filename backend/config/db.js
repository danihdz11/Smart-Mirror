import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // lee el archivo .env

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado correctamente a MongoDB");
  } catch (error) {
    console.error("Error de conexión a MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
