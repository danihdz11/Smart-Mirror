// mqtt-listener.js
import mqtt from "mqtt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { pool } from "./sql_db.js";
import { createRequire } from "module";

// Para usar libs CommonJS (magic-home) en ES Modules
const require = createRequire(import.meta.url);
const { Control, Discovery } = require("magic-home");

// =============================
// 📂 RUTAS / .env
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MQTT_URL = process.env.MQTT_URL;
const MQTT_TOPIC_PIR = process.env.MQTT_TOPIC_PIR;
const MQTT_TOPIC_LDR = process.env.MQTT_TOPIC_LDR;

if (!MQTT_URL) {
  console.error("❌ MQTT_URL not found in .env");
  process.exit(1);
}

// =============================
// 🔦 CONFIG MAGIC HOME
// =============================

// Tu ID de dispositivo Magic Home (en minúsculas)
const TARGET_ID = "b4e8422c1fe4"; // <-- ajusta si cambia

let ledEncendida = false;
let light = null;

// Últimos valores de sensores
let ultimoValorLDR = 50; // %
let ultimoValorPIR = 0;

// Convierte 0–100 → 0–255 de brillo (invirtiendo: más luz ambiente → menos brillo del foco)
function brilloA255(valor) {
  let brillo = 100 - Number(valor); // más luz → menos brillo de foco
  brillo = Math.max(0, Math.min(brillo, 100)); // clamp 0–100
  return Math.floor((brillo / 100) * 255);
}

// Busca el controlador Magic Home en la red
async function encontrarDispositivo() {
  const discovery = new Discovery();
  console.log("🔍 Buscando dispositivo Magic Home…");

  // API moderna: devuelve promesa
  const devices = await discovery.scan(5000);

  if (!devices || devices.length === 0) {
    throw new Error("No se encontraron controladores en la red.");
  }

  console.log("📡 Dispositivos detectados:", devices);

  // Buscar por ID
  const target = devices.find(
    (d) => (d.id || "").toLowerCase() === TARGET_ID
  );

  const chosen = target || devices[0];

  if (!target) {
    console.log("⚠️ No se encontró el ID, usando el primer dispositivo disponible.");
  } else {
    console.log("✨ Dispositivo encontrado por ID:", target);
  }

  return chosen.address;
}

// Encendido/apagado y brillo con datos de sensores
async function manejarDatos(triggerPIR, valorLDR) {
  console.log("📥 Datos para LED:", { triggerPIR, valorLDR });

  if (!light) {
    console.log("⚠️ La luz aún no está lista (no se encontró el dispositivo).");
    return;
  }

  const trigger = Number(triggerPIR);

  // Solo reaccionamos cuando PIR manda 1 → toggle
  if (trigger === 1) {
    if (!ledEncendida) {
      // 🔥 ENCENDER
      const brightness = brilloA255(valorLDR);
      console.log("💡 Encendiendo LED con brillo:", brightness);

      // Luz cálida (255, 160, 60)
      await light.setColorWithBrightness(255, 160, 60, brightness);
      ledEncendida = true;
    } else {
      // ❌ APAGAR
      console.log("⛔ Apagando LED…");
      await light.turnOff();
      ledEncendida = false;
    }
  }
}

// Inicializa Magic Home
async function inicializarLED() {
  try {
    const ip = await encontrarDispositivo();
    light = new Control(ip);
    console.log("🚀 LED lista en IP:", ip);

    // Opcional: apagar al inicio
    try {
      await light.turnOff();
      ledEncendida = false;
      console.log("🔧 LED apagada al inicio.");
    } catch (e) {
      console.warn("⚠️ No se pudo apagar la luz al inicio:", e.message);
    }
  } catch (err) {
    console.error(
      "❌ Error inicializando LED:",
      err instanceof Error ? err.message : err
    );
  }
}

inicializarLED();

// =============================
// 🗄️ CACHE sensor_id (MySQL)
// =============================
const SENSOR_ID_CACHE = {};

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

// =============================
// 🔗 MQTT
// =============================
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

client.on("error", (err) => {
  console.error("❌ MQTT error:", err.message);
});

// Mapear topics → nombre en tabla sensors
// En tu BD tienes: 'caja/porcentaje' (ldr) y 'caja/movimiento' (pir)
const TOPIC_TO_SENSOR_NAME = {
  [MQTT_TOPIC_LDR]: "caja/porcentaje",
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

  const sensorName = TOPIC_TO_SENSOR_NAME[topic];
  if (!sensorName) {
    console.warn("⚠️ Topic recibido sin mapeo en TOPIC_TO_SENSOR_NAME:", topic);
    return;
  }

  // 💾 Guardar en BD
  try {
    const sensorId = await getSensorIdByName(sensorName);

    await pool.query(
      "INSERT INTO data (sensor_id, value) VALUES (?, ?)",
      [sensorId, value]
    );

    console.log(
      `💾 Guardado en BD → sensor=${sensorName}, id=${sensorId}, value=${value}`
    );
  } catch (err) {
    console.error("❌ Error al guardar en BD:", err.message);
  }

  // =============================
  // 🔦 LÓGICA DE LED (Magic Home)
  // =============================
  try {
    if (topic === MQTT_TOPIC_LDR) {
      // Actualizamos último valor de LDR (porcentaje de luz)
      ultimoValorLDR = value;
    }

    if (topic === MQTT_TOPIC_PIR) {
      // PIR manda 0 o 1 → lo usamos como trigger
      ultimoValorPIR = value;

      // Usamos el último LDR conocido para el brillo
      manejarDatos(ultimoValorPIR, ultimoValorLDR).catch((e) =>
        console.error("⚠️ Error en manejarDatos:", e.message)
      );
    }
  } catch (e) {
    console.error("⚠️ Error en lógica de LED:", e.message);
  }
});
