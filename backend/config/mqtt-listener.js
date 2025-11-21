// mqtt-listener.js
import mqtt from "mqtt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { pool } from "./sql_db.js";
import { createRequire } from "module";
import { exec } from "child_process";

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
// 🔊 TTS MULTIPLATAFORMA
// =============================
const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";

function decir(texto) {
  const seguro = texto.replace(/"/g, '\\"');
  let comando;

  if (isMac) {
    comando = `say "${seguro}"`; // macOS
  } else if (isLinux) {
    comando = `espeak -v es-mx "${seguro}"`; // Raspberry Pi
  } else {
    console.log("🔊 (Simulado) Diría por bocina:", texto);
    return;
  }

  exec(comando, (error) => {
    if (error) {
      console.error("❌ Error al reproducir voz:", error.message);
    } else {
      console.log("🔊 Dije por bocina:", texto);
    }
  });
}

// =============================
// 🔦 CONFIG MAGIC HOME
// =============================
const TARGET_ID = "b4e8422c1fe4"; // <-- Ajusta si cambia

let ledEncendida = false;
let light = null;

// Valores recientes
let ultimoValorLDR = 50;
let ultimoValorPIR = 0;

// Convierte 0–100 → 0–255 (invirtiendo)
function brilloA255(valor) {
  let brillo = 100 - Number(valor);
  brillo = Math.max(0, Math.min(brillo, 100));
  return Math.floor((brillo / 100) * 255);
}

// Busca Magic Home en la red
async function encontrarDispositivo() {
  const discovery = new Discovery();
  console.log("🔍 Buscando dispositivo Magic Home…");

  const devices = await discovery.scan(5000);

  if (!devices || devices.length === 0) {
    throw new Error("No se encontraron controladores en la red.");
  }

  console.log("📡 Dispositivos detectados:", devices);

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

// Encendido/apagado con voz
async function manejarDatos(triggerPIR, valorLDR) {
  console.log("📥 Datos para LED:", { triggerPIR, valorLDR });

  if (!light) {
    console.log("⚠️ La luz aún no está lista.");
    return;
  }

  const trigger = Number(triggerPIR);

  if (trigger === 1) {
    if (!ledEncendida) {
      // 🔥 ENCENDER
      const brightness = brilloA255(valorLDR);
      console.log("💡 Encendiendo LED con brillo:", brightness);

      await light.setColorWithBrightness(255, 160, 60, brightness);
      ledEncendida = true;

      // 🔊 Voz
      decir("Di Log in para iniciar sesión");
    } else {
      // ❌ APAGAR
      console.log("⛔ Apagando LED…");
      await light.turnOff();
      ledEncendida = false;

      // 🔊 Voz
      decir("Adios vuelve pronto");
    }
  }
}

// Inicializa Magic Home
async function inicializarLED() {
  try {
    const ip = await encontrarDispositivo();
    light = new Control(ip);
    console.log("🚀 LED lista en IP:", ip);

    // Apagar al inicio
    try {
      await light.turnOff();
      ledEncendida = false;
      console.log("🔧 LED apagada al inicio.");
    } catch (e) {
      console.warn("⚠️ No se pudo apagar al inicio:", e.message);
    }
  } catch (err) {
    console.error("❌ Error inicializando LED:", err.message);
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
    throw new Error(`No se encontró sensor con name='${name}'`);
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

// Mapear topics → sensor name
const TOPIC_TO_SENSOR_NAME = {
  [MQTT_TOPIC_LDR]: "caja/porcentaje",
  [MQTT_TOPIC_PIR]: "caja/movimiento",
};

client.on("message", async (topic, message) => {
  const payload = message.toString();
  console.log(`📥 ${topic} → ${payload}`);

  const value = parseFloat(payload);
  if (Number.isNaN(value)) {
    console.warn("⚠️ Mensaje no numérico:", payload);
    return;
  }

  const sensorName = TOPIC_TO_SENSOR_NAME[topic];
  if (!sensorName) {
    console.warn("⚠️ Topic sin mapeo:", topic);
    return;
  }

  // Guardar en BD
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

  // Lógica LED + voz
  try {
    if (topic === MQTT_TOPIC_LDR) {
      ultimoValorLDR = value;
    }

    if (topic === MQTT_TOPIC_PIR) {
      ultimoValorPIR = value;
      manejarDatos(ultimoValorPIR, ultimoValorLDR).catch((e) =>
        console.error("⚠️ Error en manejarDatos:", e.message)
      );
    }
  } catch (e) {
    console.error("⚠️ Error en lógica de LED:", e.message);
  }
});
