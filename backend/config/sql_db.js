// db.js
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function must(name, { mask = false } = {}) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable ${name}`);
  if (mask) console.log(`${name}: [OK]`);
  else console.log(`${name}: ${v}`);
  return v;
}

const DB_HOST = must("DB_HOST");
const DB_PORT = Number(must("DB_PORT"));
const DB_USER = must("DB_USER");
const DB_PASSWORD = must("DB_PASSWORD", { mask: true });
const DB_NAME = must("DB_NAME");
const DB_CA_PATH_OR_PEM = must("DB_CA_PATH");

function loadCa(value) {
  const looksLikePem = value.includes("-----BEGIN CERTIFICATE-----");
  if (looksLikePem) return value;
  const abs = path.isAbsolute(value) ? value : path.resolve(__dirname, value);
  if (!fs.existsSync(abs)) throw new Error(`No encuentro el CA en: ${abs}`);
  return fs.readFileSync(abs, "utf8");
}

export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  ssl: {
    ca: loadCa(DB_CA_PATH_OR_PEM),
    rejectUnauthorized: true,
  },
});

// (opcional) pequeño test de conexión
(async () => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok;");
    console.log("Conexión MySQL OK:", rows);

    const [sensors] = await pool.query('SELECT * FROM sensors;');
    console.log("Información del sensor", sensors);

    const [data] = await pool.query('SELECT * FROM data;');
    console.log("Información de la tabla data", data);

  } catch (err) {
    console.error("Error conectando a MySQL:", err.message);
  }
})();
