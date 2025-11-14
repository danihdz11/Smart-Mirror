import bcrypt from "bcrypt"; //Esta es la librería para encriptar la contraseña
import jwt from "jsonwebtoken";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

const JWT_SECRET = "supersecret"; // puedes moverlo a .env después

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_BIN = process.env.PYTHON_PATH || "C:\\Users\\DanielHDev\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";
const ENCODER_SCRIPT = path.join(__dirname, "..", "utils", "encode_face.py");

const generateFaceEncoding = (imagePath) =>
  new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [ENCODER_SCRIPT, imagePath]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`No se pudo iniciar el proceso de Python: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        let message = stderr.trim() || "El script de codificación facial falló";
        try {
          const parsed = JSON.parse(stdout);
          if (parsed?.error) {
            message = parsed.error;
          }
        } catch {
          // ignore JSON parse error
        }
        reject(new Error(message));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (!parsed?.encoding || !Array.isArray(parsed.encoding)) {
          reject(new Error("Respuesta inválida del script de codificación facial"));
          return;
        }
        resolve(parsed.encoding);
      } catch (error) {
        reject(new Error(`No se pudo interpretar la respuesta del script: ${error.message}`));
      }
    });
  });

const removeTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`No se pudo eliminar el archivo temporal ${filePath}:`, error.message);
    }
  }
};

// Registro de usuario
export const registerUser = async (req, res) => {
  const faceImage = req.file;
  const faceImagePath = faceImage?.path;

  try {
    const { name, age, email, password, location } = req.body;

    if (!faceImage) {
      return res.status(400).json({ message: "Se requiere una imagen facial para completar el registro" });
    }

    // Validar que no exista
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const ageNumber = Number(age);
    if (Number.isNaN(ageNumber)) {
      return res.status(400).json({ message: "La edad proporcionada no es válida" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    let faceEncoding;
    try {
      faceEncoding = await generateFaceEncoding(faceImage.path);
    } catch (error) {
      console.error("Error generando codificación facial:", error);
      return res.status(400).json({
        message: "No se pudo generar la codificación facial",
        error: error.message
      });
    }

    // Crear usuario
    const newUser = new User({
      name,
      age: ageNumber,
      email,
      password: hashedPassword,
      location,
      face_encoding: faceEncoding
    });

    await newUser.save();

    res.status(201).json({ message: "Usuario registrado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar usuario", error: error.message });
  } finally {
    if (faceImagePath) {
      await removeTempFile(faceImagePath);
    }
  }
};

// Inicio de sesión
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Comparar contraseñas
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: "Contraseña incorrecta" });

    // Crear token JWT
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "3h" });

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión", error: error.message });
  }
};
