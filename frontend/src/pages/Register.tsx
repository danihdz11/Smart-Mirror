import { useState } from "react";
import { registerUser } from "../services/api";

// Definimos los tipos del formulario
interface RegisterFormData {
  name: string;
  age: number;
  email: string;
  password: string;
  location: string;
}

export default function Register() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    age: 0,
    email: "",
    password: "",
    location: "",
  });

  // Actualiza los valores del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "age" ? Number(value) : value,
    });
  };

  // Envía el formulario al backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await registerUser(formData);
      alert(res.message || "Usuario registrado correctamente");
      console.log("✅ Respuesta:", res);
    } catch (err: any) {
      console.error("❌ Error:", err.response?.data || err.message);
      alert("Error al registrar usuario");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto" }}>
      <h2>Registro</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Nombre"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          name="age"
          placeholder="Edad"
          type="number"
          value={formData.age || ""}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          placeholder="Correo electrónico"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          placeholder="Contraseña"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <input
          name="location"
          placeholder="Ubicación"
          value={formData.location}
          onChange={handleChange}
          required
        />
        <button type="submit">Registrarme</button>
      </form>
    </div>
  );
}
