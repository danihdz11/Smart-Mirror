import mqtt from "mqtt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env (one level up)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Access variable
const MQTT_URL = process.env.MQTT_URL;
const MQTT_TOPIC_PIR = process.env.MQTT_TOPIC_PIR;
const MQTT_TOPIC_LDR = process.env.MQTT_TOPIC_LDR;

// Check it's loaded
if (!MQTT_URL) {
  console.error("❌ MQTT_URL not found in .env");
  process.exit(1);
}

// Connect to broker
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

client.on("message", (topic, message) => {
  console.log(`📥 ${topic} → ${message.toString()}`);
});

client.on("error", (err) => {
  console.error("❌ MQTT error:", err.message);
});