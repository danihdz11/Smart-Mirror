// import { useState } from "react";
// import { loginUser } from "../services/api";

// interface LoginFormData {
//   email: string;
//   password: string;
// }

// export default function Login() {
//   const [formData, setFormData] = useState<LoginFormData>({
//     email: "",
//     password: "",
//   });

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       const res = await loginUser(formData);
//       alert(res.message || "Inicio de sesión exitoso");
//       console.log("✅ Usuario:", res.user);
//       console.log("🔑 Token:", res.token);

//       // Guardar token en localStorage
//       localStorage.setItem("token", res.token);
//     } catch (err: any) {
//       console.error("❌ Error:", err.response?.data || err.message);
//       alert("Error al iniciar sesión");
//     }
//   };

//   return (
//     <div style={{ maxWidth: "400px", margin: "auto" }}>
//       <h2>Iniciar sesión</h2>
//       <form onSubmit={handleSubmit}>
//         <input
//           name="email"
//           placeholder="Correo electrónico"
//           type="email"
//           value={formData.email}
//           onChange={handleChange}
//           required
//         />
//         <input
//           name="password"
//           placeholder="Contraseña"
//           type="password"
//           value={formData.password}
//           onChange={handleChange}
//           required
//         />
//         <button type="submit">Entrar</button>
//       </form>
//     </div>
//   );
// }



import { useState } from "react";
import { loginUser } from "../services/api";

interface LoginFormData {
  email: string;
  password: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginUser(formData);
      alert(res.message || "Inicio de sesión exitoso");
      console.log("✅ Usuario:", res.user);
      console.log("🔑 Token:", res.token);

      // Guardar token en localStorage
      localStorage.setItem("token", res.token);
    } catch (err: any) {
      console.error("Error:", err.response?.data || err.message);
      alert("Error al iniciar sesión");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {/* Card */}
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Iniciar sesión
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

