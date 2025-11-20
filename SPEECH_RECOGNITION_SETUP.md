# 🎤 Configuración de Reconocimiento de Voz para Raspberry Pi

Este documento explica cómo configurar el reconocimiento de voz que funciona en Raspberry Pi con Chromium.

## 📋 Requisitos Previos

### En Raspberry Pi:

1. **Python 3** (generalmente ya viene instalado)
   ```bash
   python3 --version
   ```

2. **Instalar dependencias de Python:**
   ```bash
   pip3 install -r backend/requirements.txt
   ```

3. **Instalar ffmpeg** (para conversión de audio):
   
   **En Linux/Raspberry Pi:**
   ```bash
   sudo apt-get update
   sudo apt-get install -y ffmpeg
   ```
   
   **En Windows:**
   - Opción 1: Descargar de https://ffmpeg.org/download.html
     - Descarga el build estático
     - Extrae el archivo ZIP
     - Agrega la carpeta `bin` al PATH de Windows
   - Opción 2: Usar Chocolatey (si lo tienes instalado):
     ```bash
     choco install ffmpeg
     ```
   - Opción 3: Usar winget (Windows 10/11):
     ```bash
     winget install ffmpeg
     ```
   
   **En Mac:**
   ```bash
   brew install ffmpeg
   ```
   
   **Verificar instalación:**
   ```bash
   ffmpeg -version
   ```

4. **Instalar motor de síntesis de voz (TTS):**
   
   **En Raspberry Pi/Linux (recomendado para mejor calidad en español):**
   ```bash
   sudo apt-get update
   sudo apt-get install -y libttspico-utils espeak espeak-data
   ```
   
   **Nota:** `pico2wave` (parte de `libttspico-utils`) ofrece mejor calidad en español que `espeak`.
   
   **Solo con espeak (alternativa más ligera):**
   ```bash
   sudo apt-get update
   sudo apt-get install -y espeak espeak-data
   ```
   
   **Verificar instalación:**
   ```bash
   # Probar pico2wave (mejor calidad)
   pico2wave -l es-ES -w test.wav "Hola, esto es una prueba"
   aplay test.wav
   
   # O probar espeak (alternativa)
   espeak -s 150 -v es "Hola, esto es una prueba" -w test.wav
   aplay test.wav
   ```

5. **Verificar que el micrófono funcione:**
   ```bash
   arecord -l  # Listar dispositivos de audio
   arecord -d 5 test.wav  # Grabar 5 segundos de audio
   aplay test.wav  # Reproducir el audio
   ```

## 🔧 Configuración

### 1. Backend

El backend ya está configurado para usar el reconocimiento de voz. Asegúrate de que:

- El servidor Node.js esté corriendo en el puerto 5001
- Python 3 esté disponible en el PATH
- Las dependencias de Python estén instaladas

### 2. Frontend

El frontend ahora usa `MediaRecorder API` en lugar de `Web Speech API`, lo que lo hace compatible con Chromium en Raspberry Pi.

## 🚀 Uso

1. **Iniciar el backend:**
   ```bash
   cd backend
   npm install  # Si no has instalado las dependencias
   npm start
   ```

2. **Iniciar el frontend:**
   ```bash
   cd frontend
   npm install  # Si no has instalado las dependencias
   npm run dev
   ```

3. **Permitir acceso al micrófono:**
   - Cuando el navegador pida permiso para acceder al micrófono, haz clic en "Permitir"
   - En Chromium, esto puede requerir configuración adicional si estás en modo kiosco

## 🔍 Solución de Problemas

### El micrófono no funciona

1. **Verificar permisos del micrófono:**
   ```bash
   # En Raspberry Pi, verificar que el usuario tenga acceso al audio
   groups $USER
   # Si no está en el grupo 'audio', agregarlo:
   sudo usermod -a -G audio $USER
   # Luego reiniciar sesión
   ```

2. **Verificar que Chromium tenga permisos:**
   - En Chromium, ve a `chrome://settings/content/microphone`
   - Asegúrate de que el sitio tenga permisos

### Error: "ffmpeg no disponible"

Si ves este error, instala ffmpeg:
```bash
sudo apt-get install -y ffmpeg
```

### Error: "speech_recognition no encontrado"

Instala las dependencias de Python:
```bash
pip3 install speechrecognition pydub
```

### Error: "No se encontró un motor TTS instalado"

Si escuchas que el asistente habla pero no se reproduce el audio (especialmente en Raspberry Pi), necesitas instalar un motor TTS:

**Para mejor calidad en español (recomendado):**
```bash
sudo apt-get update
sudo apt-get install -y libttspico-utils
```

**Alternativa más ligera:**
```bash
sudo apt-get update
sudo apt-get install -y espeak espeak-data
```

**Verificar que funciona:**
```bash
pico2wave -l es-ES -w test.wav "Prueba de audio"
aplay test.wav  # Deberías escuchar el audio por los audífonos
```

Si `aplay` funciona pero el asistente no, verifica que el backend esté corriendo y que el frontend esté conectado correctamente.

### El reconocimiento no funciona correctamente

1. **Verificar que el audio se esté grabando:**
   - Revisa la consola del navegador para ver si hay errores
   - Verifica que el micrófono esté funcionando con `arecord`

2. **Ajustar la configuración del micrófono:**
   - En el código, puedes ajustar los parámetros de `getUserMedia`:
     ```typescript
     audio: {
       echoCancellation: true,
       noiseSuppression: true,
       autoGainControl: true,
     }
     ```

## 📝 Notas

- El reconocimiento de voz usa la API gratuita de Google Speech Recognition
- No requiere autenticación ni API keys
- Funciona mejor con conexión a internet estable
- El audio se graba en chunks de 3 segundos para procesamiento continuo

## 🔄 Cambios Realizados

1. **Frontend (`useVirtualAssistant.ts`):**
   - Reemplazado `Web Speech API` con `MediaRecorder API`
   - El audio se graba y envía al backend para procesamiento
   - Mantiene toda la lógica de comandos existente

2. **Backend:**
   - Nuevo endpoint `/api/speech/transcribe`
   - Usa Python con `speech_recognition` para procesar el audio
   - Convierte el audio a formato WAV usando ffmpeg

3. **API Service:**
   - Nueva función `transcribeAudio()` en `api.ts`
   - Envía el audio al backend para transcripción
   - Nueva función `synthesizeSpeech()` en `api.ts`
   - Envía texto al backend para generar audio

4. **Síntesis de Voz (TTS):**
   - El asistente ahora usa el backend para generar audio con TTS
   - Usa `pico2wave` o `espeak` en lugar de `speechSynthesis` del navegador
   - Esto soluciona el problema de audio en Raspberry Pi donde `speechSynthesis` no funciona
   - El audio se reproduce igual que YouTube (usa el sistema de audio del OS)
   - Fallback automático a `speechSynthesis` del navegador si el backend falla

