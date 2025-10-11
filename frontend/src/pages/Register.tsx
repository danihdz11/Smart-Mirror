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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {/* Card */}
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Registro de usuario
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Nombre completo"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            name="age"
            placeholder="Edad"
            type="number"
            value={formData.age || ""}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            name="email"
            placeholder="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            name="password"
            placeholder="Contraseña"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            name="location"
            placeholder="Ubicación"
            value={formData.location}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Registrarme
          </button>
        </form>
      </div>
    </div>
  );
}


{/* <div style={{ maxWidth: "400px", margin: "auto" }}>
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
    </div> */}