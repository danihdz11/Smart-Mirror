import Joi from "joi";

// Validación de eventos
export const eventSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  date: Joi.date().required(),
  time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) // formato HH:mm
    .required(),
  location: Joi.string().allow("") // opcional
});

// Validación de tareas
export const taskSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  date: Joi.date().optional().allow(null),    // .required()
  time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required(),
  repeat: Joi.string()
    .valid("none", "daily", "weekly", "monthly")
    .default("none")
});

// Validación del usuario completo
export const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  age: Joi.number().integer().min(0).max(120).required(), 
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  location: Joi.string().min(2).max(100).required(),
  faceId: Joi.string().allow(null, ""),  // opcional
  imageUrl: Joi.string().uri().allow(null, ""), // opcional
  face_encoding: Joi.array().items(Joi.number()), //.length(128).required()
  events: Joi.array().items(eventSchema),
  tasks: Joi.array().items(taskSchema)
});
