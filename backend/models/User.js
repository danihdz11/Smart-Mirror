import mongoose from "mongoose";

// Subdocumento: eventos (para mostrar en el espejo)
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // formato "HH:mm"
  location: { type: String }
});

// Subdocumento: tareas (con opción de repetición)
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  repeat: {
    type: String,
    enum: ["none", "daily", "weekly", "monthly"],
    default: "none"
  }
});

// Esquema principal de usuario
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },                // nombre del usuario
  age: { type: Number, required: true, min: 0 },         // edad (nueva propiedad)
  email: { type: String, required: true, unique: true }, // email único
  password: { type: String, required: true },            // contraseña
  location: { type: String, required: true },            // ciudad del usuario
  faceId: { type: String },                              // ID facial generado por Python
  imageUrl: { type: String },                            // URL de la imagen base
  face_encoding: {tupe: Number, required: true},
  events: [eventSchema],                                 // lista de eventos
  tasks: [taskSchema],                                   // lista de tareas
  createdAt: { type: Date, default: Date.now }           // fecha de creación
});

export default mongoose.model("User", userSchema);
