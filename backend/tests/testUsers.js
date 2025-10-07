// tests/testUsers.js
import User from "../models/User.js";
import { userSchema } from "../models/userValidation.js";

export const testUsers = async () => {
  try {
    // 🧹 Limpiar la colección antes de probar
    // await User.deleteMany({});
    // console.log("🧹 Usuarios anteriores eliminados");

    // ✅ Usuario válido
    const validUser = {
      name: "Guillermo de la Torre",
      age: 21,
      email: "memo@example.com",
      password: "123456",
      location: "Guadalajara, MX",
      faceId: "face_user_001",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/memo.jpg",
      events: [
        {
          title: "Reunión del equipo IoT",
          date: "2025-10-08",
          time: "09:00",
          location: "Tec de Monterrey GDL"
        }
      ],
      tasks: [
        {
          title: "Probar conexión MQTT",
          date: "2025-10-07",
          time: "20:00",
          repeat: "none"
        }
      ]
    };

    // ❌ Usuario inválido (edad negativa)
    const invalidUser = {
      name: "Usuario con edad negativa",
      age: -5, // ❌ edad inválida
      email: "edadnegativa@example.com",
      password: "123456",
      location: "Guadalajara, MX"
    };

    // Validar ambos con Joi
    const validResult = userSchema.validate(validUser, { abortEarly: false });
    const invalidResult = userSchema.validate(invalidUser, { abortEarly: false });

    console.log("\n=== 🧩 PRUEBA DE USUARIO VÁLIDO ===");
    if (validResult.error) {
      console.log("❌ Error en validación de usuario válido:", validResult.error.details);
    } else {
      const newUser = new User(validResult.value);
      await newUser.save();
      console.log("✅ Usuario válido guardado correctamente en MongoDB");
    }

    console.log("\n=== ⚠️ PRUEBA DE USUARIO INVÁLIDO ===");
    if (invalidResult.error) {
      console.log("❌ Errores detectados en validación:");
      invalidResult.error.details.forEach(e => console.log(`- ${e.message}`));
    } else {
      console.log("⚠️ (Esto no debería pasar) Usuario inválido fue aceptado.");
    }

  } catch (err) {
    console.error("❌ Error durante las pruebas:", err.message);
  }
};
