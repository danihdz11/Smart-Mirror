// mqtt-listener.js
import mqtt from "mqtt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { pool } from "./sql_db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MQTT_URL = process.env.MQTT_URL;
const MQTT_TOPIC_PIR = process.env.MQTT_TOPIC_PIR;
const MQTT_TOPIC_LDR = process.env.MQTT_TOPIC_LDR;

if (!MQTT_URL) {
  console.error("❌ MQTT_URL not found in .env");
  process.exit(1);
}

// Cache para no consultar el sensor_id cada vez
const SENSOR_ID_CACHE = {};

// Si el nombre del sensor en la BD es exactamente el topic, esto funciona directo.
// Si no, aquí puedes hacer un mapeo manual.
async function getSensorIdByName(name) {
  if (SENSOR_ID_CACHE[name]) return SENSOR_ID_CACHE[name];

  const [rows] = await pool.query(
    "SELECT id FROM sensors WHERE name = ?",
    [name]
  );

  if (rows.length === 0) {
    throw new Error(`No se encontró sensor con name='${name}' en la tabla sensors`);
  }

  const id = rows[0].id;
  SENSOR_ID_CACHE[name] = id;
  return id;
}

const client = mqtt.connect(MQTT_URL, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  reconnectPeriod: 2000,
  keepalive: 30,
  clean: true,
});

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker!");

  client.subscribe(MQTT_TOPIC_LDR);
  client.subscribe(MQTT_TOPIC_PIR);

  console.log("📡 Subscribed to both topics");
});

const TOPIC_TO_SENSOR_NAME = {
  [MQTT_TOPIC_LDR]: "caja/porcentaje",   // topic → name en la tabla
  [MQTT_TOPIC_PIR]: "caja/movimiento",
};

client.on("message", async (topic, message) => {
  const payload = message.toString();
  console.log(`📥 ${topic} → ${payload}`);

  const value = parseFloat(payload);
  if (Number.isNaN(value)) {
    console.warn("⚠️ Mensaje no numérico, no se inserta en la BD:", payload);
    return;
  }

  // Usar el mapa en lugar de topic directo
  const sensorName = TOPIC_TO_SENSOR_NAME[topic];
  if (!sensorName) {
    console.warn("⚠️ Topic recibido sin mapeo en TOPIC_TO_SENSOR_NAME:", topic);
    return;
  }

  try {
    const sensorId = await getSensorIdByName(sensorName);

    await pool.query(
      "INSERT INTO data (sensor_id, value) VALUES (?, ?)",
      [sensorId, value]
    );

    console.log(`💾 Guardado en BD → sensor=${sensorName}, id=${sensorId}, value=${value}`);
  } catch (err) {
    console.error("❌ Error al guardar en BD:", err.message);
  }
});

client.on("error", (err) => {
  console.error("❌ MQTT error:", err.message);
});
