#include <WiFi.h>
#include <PubSubClient.h>

/* =========================
   🔌 CONFIG WIFI / MQTT
   ========================= */
const char* ssid       = "iPhone de Hugo";
const char* password   = "pepeh2014";
const char* mqttServer = "broker.mqtt.cool";
const int   mqttPort   = 1883;

// Topics
const char* TOPIC_PIR  = "pir/caja/movimiento";  // 1 o 0
const char* TOPIC_LDR  = "ldr/caja/porcentaje";  // 0–100 (float con 1 decimal)

/* =========================
   ⚙️ HARDWARE PINS
   ========================= */
// PIR
#define PIR_PIN 4
// LDR (usar ADC1; 34 es solo entrada analógica)
const int LDR_PIN = 34;

/* =========================
   ⏱️ TIMING
   ========================= */
unsigned long calibrationTime = 30000UL; // 30s PIR
unsigned long pirCalibStart   = 0;
bool pirReady                 = false;

const unsigned long LDR_INTERVAL = 5000UL; // publicar cada 5 s
unsigned long lastLdrMillis      = 0;

/* =========================
   📏 ADC CONFIG
   ========================= */
const int   ADC_MAX = 4095;  // 12 bits ESP32
// Nota: la Vref interna varía, usamos porcentaje a partir del raw

/* =========================
   📡 CLIENTES
   ========================= */
WiFiClient espClient;
PubSubClient client(espClient);

/* =========================
   🔁 FUNCIONES
   ========================= */
void setup_wifi() {
  Serial.print("Conectando a WiFi: "); Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi conectado");
  Serial.print("IP: "); Serial.println(WiFi.localIP());
}

void mqtt_reconnect() {
  while (!client.connected()) {
    Serial.print("Conectando a MQTT...");
    String clientId = "ESP32-MULTI-";
    clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println(" conectado ✅");
    } else {
      Serial.print(" fallo, rc="); Serial.print(client.state());
      Serial.println(" -> reintento en 2s");
      delay(2000);
    }
  }
}

/* =========================
   🚀 SETUP
   ========================= */
void setup() {
  Serial.begin(115200);
  delay(600);

  // PIR
  pinMode(PIR_PIN, INPUT);

  // ADC: ancho 12 bits y atenuación 11dB (~0-3.3V)
  analogSetWidth(12);
  analogSetAttenuation(ADC_11db);

  setup_wifi();
  client.setServer(mqttServer, mqttPort);
  randomSeed(micros());

  // Calibración PIR sin bloquear
  pirCalibStart = millis();
  pirReady = false;

  Serial.println("⏳ Calibrando PIR (30s), evita moverte frente al sensor...");
}

/* =========================
   🔂 LOOP
   ========================= */
int lastPirState = LOW;

void loop() {
  // Mantener conexión MQTT
  if (!client.connected()) mqtt_reconnect();
  client.loop();

  // Fin de calibración PIR (no bloqueante)
  if (!pirReady && (millis() - pirCalibStart >= calibrationTime)) {
    pirReady = true;
    Serial.println("✅ PIR listo. Publicando 1/0 en cambios.");
  }

  // ===== PIR: publicar solo cuando cambie =====
  if (pirReady) {
    int state = digitalRead(PIR_PIN);
    if (state != lastPirState) {
      lastPirState = state;
      if (state == HIGH) {
        Serial.println("💡 Movimiento detectado");
        client.publish(TOPIC_PIR, "1");
      } else {
        Serial.println("⏹ Sin movimiento");
        client.publish(TOPIC_PIR, "0");
      }
    }
  }

  // ===== LDR: publicar cada 5s =====
  unsigned long now = millis();
  if (now - lastLdrMillis >= LDR_INTERVAL) {
    lastLdrMillis = now;

    int raw = analogRead(LDR_PIN);              // 0..4095
    float pct = (raw / (float)ADC_MAX) * 100.0; // 0..100
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;

    // Serial
    Serial.print("LDR -> RAW: ");
    Serial.print(raw);
    Serial.print("  Luz: ");
    Serial.print(pct, 1);
    Serial.println(" %");

    // Publicar como string con 1 decimal
    char payload[16];
    dtostrf(pct, 0, 1, payload); // ej. "78.5"
    client.publish(TOPIC_LDR, payload);
  }

  // Pequeño respiro
  delay(20);
}