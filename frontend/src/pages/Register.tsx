// import { useState } from "react";
// import { registerUser } from "../services/api";

// // Definimos los tipos del formulario
// interface RegisterFormData {
//   name: string;
//   age: number;
//   email: string;
//   password: string;
//   location: string;
// }

// export default function Register() {
//   const [formData, setFormData] = useState<RegisterFormData>({
//     name: "",
//     age: 0,
//     email: "",
//     password: "",
//     location: "",
//   });

//   // Actualiza los valores del formulario
//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData({
//       ...formData,
//       [name]: name === "age" ? Number(value) : value,
//     });
//   };

//   // Envía el formulario al backend
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       const res = await registerUser(formData);
//       alert(res.message || "Usuario registrado correctamente");
//       console.log("Respuesta:", res);
//     } catch (err: any) {
//       console.error("Error:", err.response?.data || err.message);
//       alert("Error al registrar usuario");
//     }
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100">
//       {/* Card */}
//       <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
//         <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
//           Registro de usuario
//         </h2>

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <input
//             name="name"
//             placeholder="Nombre completo"
//             value={formData.name}
//             onChange={handleChange}
//             required
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />

//           <input
//             name="age"
//             placeholder="Edad"
//             type="number"
//             value={formData.age || ""}
//             onChange={handleChange}
//             required
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />

//           <input
//             name="email"
//             placeholder="Correo electrónico"
//             type="email"
//             value={formData.email}
//             onChange={handleChange}
//             required
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />

//           <input
//             name="password"
//             placeholder="Contraseña"
//             type="password"
//             value={formData.password}
//             onChange={handleChange}
//             required
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />

//           <input
//             name="location"
//             placeholder="Ubicación"
//             value={formData.location}
//             onChange={handleChange}
//             required
//             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />

//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
//           >
//             Registrarme
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }




import { useState } from "react";
import { registerUser } from "../services/api";

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

  // Estado solo para guardar la imagen (NO se envía ni se convierte)
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "age" ? Number(value) : value,
    });
  };

  // Subida de imagen facial (solo guarda el archivo)
  const handleFaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFaceError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    const maxSizeMB = 3;

    if (!validTypes.includes(file.type)) {
      setFaceError("Formato no válido. Usa JPG, PNG o WEBP.");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setFaceError(`La imagen supera ${maxSizeMB} MB.`);
      return;
    }

    setFaceFile(file);
    setFacePreview(URL.createObjectURL(file)); // preview temporal
  };

  const removeFace = () => {
    setFaceFile(null);
    setFacePreview(null);
    setFaceError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Solo guardamos los datos del usuario
      const res = await registerUser(formData);
      alert(res.message || "Usuario registrado correctamente");
      console.log("✅ Respuesta:", res);

      // Solo mostramos información del archivo facial si existe
      if (faceFile) {
        console.log("📸 Imagen facial temporal:", {
          name: faceFile.name,
          sizeKB: Math.round(faceFile.size / 1024),
          type: faceFile.type,
        });
      }

      // NOTA: aquí no se guarda ni se sube la imagen a la base
      // Tu compañero puede acceder a esta imagen (faceFile)
      // para procesarla en otro script y generar el vector.

    } catch (err: any) {
      console.error("❌ Error:", err.response?.data || err.message);
      alert("Error al registrar usuario");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
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
            className="w-full px-4 py-2 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="age"
            placeholder="Edad"
            type="number"
            value={formData.age || ""}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="email"
            placeholder="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="password"
            placeholder="Contraseña"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="location"
            placeholder="Ubicación"
            value={formData.location}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
          />

          {/* --- Subida de imagen facial --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foto de Rostro del Usuario
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center ${
                faceError ? "border-red-400" : "border-gray-300"
              }`}
            >
              <input
                id="faceImage"
                type="file"
                accept="image/*"
                onChange={handleFaceChange}
                className="hidden"
              />
              <label
                htmlFor="faceImage"
                className="cursor-pointer inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
              >
                Seleccionar imagen
              </label>

              <p className="text-xs text-gray-500 mt-2">
                JPG/PNG/WEBP — máx. 3&nbsp;MB.
              </p>

              {faceError && (
                <p className="text-sm text-red-600 mt-2">{faceError}</p>
              )}

              {facePreview && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <img
                    src={facePreview}
                    alt="Preview rostro"
                    className="w-32 h-32 object-cover rounded-full border"
                  />
                  <button
                    type="button"
                    onClick={removeFace}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Quitar imagen
                  </button>
                </div>
              )}
            </div>
          </div>

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

