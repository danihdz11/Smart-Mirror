import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga .env relativo a este archivo:
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function must(name, { mask = false } = {}) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable ${name}`);
  if (mask) console.log(`${name}: [OK]`); else console.log(`${name}: ${v}`);
  return v;
}

const DB_HOST = must("DB_HOST");
const DB_PORT = Number(must("DB_PORT"));
const DB_USER = must("DB_USER");
const DB_PASSWORD = must("DB_PASSWORD", { mask: true });
const DB_NAME = must("DB_NAME");
const DB_CA_PATH_OR_PEM = must("DB_CA_PATH"); // puede ser ruta o PEM inline

function loadCa(value) {
  const looksLikePem = value.includes("-----BEGIN CERTIFICATE-----");
  if (looksLikePem) return value; // PEM inline en la env
  const abs = path.isAbsolute(value) ? value : path.resolve(__dirname, value);
  if (!fs.existsSync(abs)) throw new Error(`No encuentro el CA en: ${abs}`);
  return fs.readFileSync(abs, "utf8");
}

const pool = mysql.createPool({
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

try {
  const [rows] = await pool.query("SELECT 1 AS ok;");
  console.log("Conexión OK:", rows);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50)
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sensor_id INT NOT NULL,
      value FLOAT NOT NULL,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (sensor_id) REFERENCES sensors(id)
       ON DELETE CASCADE
       ON UPDATE CASCADE
    );
  `)

  console.log("Tables created!");

} catch (err) {
  console.error("Error conectando:", err?.message);
}