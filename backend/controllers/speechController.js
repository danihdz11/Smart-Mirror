import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Transcribe audio usando Google Speech Recognition API
 * Esta función usa la API gratuita de Google que no requiere autenticación
 */
export const transcribeAudio = async (req, res) => {
  try {
    // Debug: verificar qué se está recibiendo
    console.log('Request recibido:', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
      fieldname: req.file?.fieldname,
      body: req.body
    });

    if (!req.file) {
      console.error('Error: No se recibió archivo de audio');
      return res.status(400).json({ error: 'No se recibió archivo de audio' });
    }

    // Verificar que el archivo no esté vacío
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error('Error: Archivo de audio vacío');
      return res.status(400).json({ error: 'El archivo de audio está vacío' });
    }

    // Verificar tamaño mínimo (al menos 1KB)
    if (req.file.buffer.length < 1024) {
      console.warn('Advertencia: Archivo de audio muy pequeño:', req.file.buffer.length, 'bytes');
      // No retornar error, pero registrar la advertencia
    }

    const audioBuffer = req.file.buffer;
    const lang = req.body.lang || 'es-MX';

    // Guardar temporalmente el audio
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `audio_${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Declarar pythonScriptPath fuera del try para que esté disponible en el catch
    let pythonScriptPath = null;

    try {
      // Usar Python con speech_recognition y pydub para transcribir
      // Nota: pydub requiere ffmpeg para convertir formatos como WebM
      const pythonScript = `
import speech_recognition as sr
from pydub import AudioSegment
import sys
import os
import tempfile
import subprocess

r = sr.Recognizer()
audio_file = sys.argv[1]
lang = sys.argv[2]

# Verificar si ffmpeg está disponible
def check_ffmpeg():
    try:
        # Intentar con 'ffmpeg' primero
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True, timeout=5)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        # Si falla, intentar con rutas comunes de Windows
        import shutil
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            try:
                subprocess.run([ffmpeg_path, '-version'], capture_output=True, check=True, timeout=5)
                return True
            except:
                return False
        return False

try:
    # Intentar convertir el audio a WAV usando pydub
    # pydub requiere ffmpeg para formatos como WebM
    try:
        # Verificar ffmpeg primero
        if not check_ffmpeg():
            raise Exception("ffmpeg no está instalado. Por favor instálalo primero.")
        
        # Configurar pydub para usar ffmpeg explícitamente si está disponible
        import shutil
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            AudioSegment.converter = ffmpeg_path
            AudioSegment.ffmpeg = ffmpeg_path
            AudioSegment.ffprobe = ffmpeg_path.replace('ffmpeg', 'ffprobe') if os.path.exists(ffmpeg_path.replace('ffmpeg', 'ffprobe')) else None
        
        # Detectar el formato del archivo
        file_ext = os.path.splitext(audio_file)[1].lower()
        
        # Cargar el audio según su formato
        if file_ext == '.webm':
            audio_segment = AudioSegment.from_file(audio_file, format="webm")
        elif file_ext == '.ogg':
            audio_segment = AudioSegment.from_file(audio_file, format="ogg")
        elif file_ext == '.mp3':
            audio_segment = AudioSegment.from_file(audio_file, format="mp3")
        elif file_ext == '.wav':
            audio_segment = AudioSegment.from_file(audio_file, format="wav")
        else:
            # Intentar detectar automáticamente
            audio_segment = AudioSegment.from_file(audio_file)
        
        # Convertir a formato compatible: mono, 16kHz, 16-bit
        audio_segment = audio_segment.set_channels(1)  # Mono
        audio_segment = audio_segment.set_frame_rate(16000)  # 16kHz
        audio_segment = audio_segment.set_sample_width(2)  # 16-bit
        
        # Guardar como WAV temporal
        temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_wav_path = temp_wav.name
        temp_wav.close()
        
        audio_segment.export(temp_wav_path, format="wav")
        
        # Usar el archivo WAV convertido
        audio_file_to_use = temp_wav_path
        
    except Exception as convert_error:
        error_msg = str(convert_error)
        # Si el error menciona ffmpeg, dar un mensaje más claro
        if 'ffmpeg' in error_msg.lower():
            print(f"ERROR: ffmpeg no está instalado o no está en el PATH. Por favor instálalo:", file=sys.stderr)
            print("  Windows: Descarga de https://ffmpeg.org/download.html o usa: choco install ffmpeg", file=sys.stderr)
            print("  Linux/Mac: sudo apt-get install ffmpeg o brew install ffmpeg", file=sys.stderr)
            raise Exception("ffmpeg requerido para convertir audio")
        # Si la conversión falla por otra razón, intentar usar el archivo original
        print(f"WARNING: No se pudo convertir el audio: {convert_error}", file=sys.stderr)
        audio_file_to_use = audio_file
    
    # Transcribir el audio
    with sr.AudioFile(audio_file_to_use) as source:
        # Ajustar para ruido ambiental
        r.adjust_for_ambient_noise(source, duration=0.5)
        audio = r.record(source)
    
    text = r.recognize_google(audio, language=lang)
    print(text)
    
    # Limpiar archivo temporal si se creó
    if 'temp_wav_path' in locals() and os.path.exists(temp_wav_path):
        try:
            os.unlink(temp_wav_path)
        except:
            pass
            
except sr.UnknownValueError:
    print("ERROR: No se pudo entender el audio")
except sr.RequestError as e:
    print(f"ERROR: Error en el servicio: {e}")
except Exception as e:
    print(f"ERROR: {e}")
`;

      pythonScriptPath = path.join(tempDir, `transcribe_${Date.now()}.py`);
      fs.writeFileSync(pythonScriptPath, pythonScript);

      // Ejecutar el script de Python
      // El script de Python ahora usa pydub para convertir el audio internamente
      // No necesitamos convertir con ffmpeg antes
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      const { stdout, stderr } = await execAsync(
        `"${pythonCommand}" "${pythonScriptPath}" "${tempFilePath}" "${lang}"`
      );

      // Limpiar archivos temporales
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(pythonScriptPath)) fs.unlinkSync(pythonScriptPath);
      } catch (cleanupError) {
        console.error('Error al limpiar archivos temporales:', cleanupError);
      }

      // Verificar si hay errores en stdout o stderr
      const errorOutput = (stderr || '').toString();
      const combinedOutput = stdout + '\n' + errorOutput;
      
      if (stdout.includes('ERROR:') || errorOutput.includes('ERROR:') || combinedOutput.includes('ffmpeg requerido')) {
        let errorMsg = '';
        
        // Buscar el error en stdout primero
        if (stdout.includes('ERROR:')) {
          errorMsg = stdout.split('ERROR:')[1].trim();
        }
        // Si no está en stdout, buscar en stderr
        else if (errorOutput.includes('ERROR:')) {
          errorMsg = errorOutput.split('ERROR:')[1].trim();
        }
        // Si menciona ffmpeg requerido directamente
        else if (combinedOutput.includes('ffmpeg requerido')) {
          errorMsg = 'ffmpeg requerido para convertir audio';
        }
        
        // Si el error menciona ffmpeg, dar instrucciones específicas
        if (errorMsg.includes('ffmpeg') || errorMsg.includes('ffmpeg requerido') || combinedOutput.includes('ffmpeg')) {
          const isWindows = process.platform === 'win32';
          const installInstructions = isWindows
            ? 'Descarga ffmpeg de https://ffmpeg.org/download.html y agrégalo al PATH, o usa: choco install ffmpeg'
            : 'Ejecuta: sudo apt-get install ffmpeg (Linux) o brew install ffmpeg (Mac)';
          
          return res.status(400).json({ 
            error: `ffmpeg no está instalado o no está en el PATH. ${installInstructions}`,
            transcript: null 
          });
        }
        
        return res.status(400).json({ 
          error: errorMsg || 'No se pudo transcribir el audio',
          transcript: null 
        });
      }

      const transcript = stdout.trim();
      
      if (!transcript || transcript.length === 0) {
        return res.status(400).json({ 
          error: 'No se pudo transcribir el audio',
          transcript: null 
        });
      }

      res.json({ 
        transcript: transcript,
        confidence: 1.0 // La API de Google no devuelve confianza, usar 1.0 por defecto
      });

    } catch (pythonError) {
      // Limpiar archivos temporales en caso de error
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (pythonScriptPath && fs.existsSync(pythonScriptPath)) {
          fs.unlinkSync(pythonScriptPath);
        }
      } catch (cleanupError) {
        console.error('Error al limpiar archivos temporales:', cleanupError);
      }

      console.error('Error al ejecutar Python:', pythonError);
      
      // Verificar el tipo de error
      const errorMsg = pythonError.message || '';
      const errorOutput = (pythonError.stderr || pythonError.stdout || '').toString();
      
      // Verificar si el error es por falta de pydub
      if (errorMsg.includes('pydub') || errorOutput.includes('pydub') || errorOutput.includes('ModuleNotFoundError: No module named \'pydub\'')) {
        return res.status(500).json({ 
          error: 'pydub no está instalado. Ejecuta: pip install pydub speechrecognition',
          details: errorOutput || errorMsg 
        });
      }
      
      if (errorMsg.includes('ffmpeg') || errorOutput.includes('ffmpeg')) {
        const isWindows = process.platform === 'win32';
        const installCmd = isWindows 
          ? 'Descarga de https://ffmpeg.org/download.html o usa: choco install ffmpeg'
          : 'sudo apt-get install ffmpeg (Linux) o brew install ffmpeg (Mac)';
        
        return res.status(500).json({ 
          error: `ffmpeg no está instalado. ${installCmd}`,
          details: errorMsg 
        });
      }
      
      // Fallback: intentar con una solución alternativa
      return res.status(500).json({ 
        error: 'Error al procesar el audio. Asegúrate de tener Python3, speech_recognition, pydub y ffmpeg instalados.',
        details: errorOutput || errorMsg
      });
    }

  } catch (error) {
    console.error('Error en transcribeAudio:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

/**
 * Sintetiza texto a voz usando espeak o pico2wave
 * Esta función genera audio que funciona igual que YouTube (sistema de audio del OS)
 */
export const synthesizeSpeech = async (req, res) => {
  try {
    const { text, lang = 'es' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'El texto es requerido' });
    }

    // Directorio temporal para guardar el audio
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const audioFileName = `tts_${Date.now()}.wav`;
    const audioFilePath = path.join(tempDir, audioFileName);

    try {
      // Intentar primero con pico2wave (mejor calidad, especialmente en español)
      // pico2wave está disponible en Raspberry Pi OS
      try {
        await execAsync(`pico2wave -l ${lang}-ES -w "${audioFilePath}" "${text}"`);
        
        // Verificar que el archivo se creó correctamente
        if (fs.existsSync(audioFilePath)) {
          const stats = fs.statSync(audioFilePath);
          if (stats.size > 0) {
            console.log(`✅ Audio generado con pico2wave: ${audioFilePath}`);
            
            // Enviar el archivo de audio
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Content-Disposition', `inline; filename="${audioFileName}"`);
            
            const audioBuffer = fs.readFileSync(audioFilePath);
            res.send(audioBuffer);
            
            // Limpiar archivo después de un delay (para asegurar que se envió)
            setTimeout(() => {
              try {
                if (fs.existsSync(audioFilePath)) {
                  fs.unlinkSync(audioFilePath);
                }
              } catch (cleanupError) {
                console.error('Error al limpiar archivo de audio:', cleanupError);
              }
            }, 1000);
            
            return;
          }
        }
      } catch (picoError) {
        console.log('pico2wave no disponible, intentando con espeak...');
        // Si pico2wave falla, continuar con espeak
      }

      // Fallback a espeak (disponible en la mayoría de sistemas Linux)
      // espeak -s velocidad -v idioma texto -w archivo_salida
      // -s 150 = velocidad normal
      // -v es = español, -v es-es = español de España, etc.
      const espeakLang = lang === 'es' ? 'es' : lang;
      await execAsync(`espeak -s 150 -v ${espeakLang} "${text}" -w "${audioFilePath}"`);
      
      // Verificar que el archivo se creó correctamente
      if (fs.existsSync(audioFilePath)) {
        const stats = fs.statSync(audioFilePath);
        if (stats.size > 0) {
          console.log(`✅ Audio generado con espeak: ${audioFilePath}`);
          
          // Enviar el archivo de audio
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Content-Disposition', `inline; filename="${audioFileName}"`);
          
          const audioBuffer = fs.readFileSync(audioFilePath);
          res.send(audioBuffer);
          
          // Limpiar archivo después de un delay
          setTimeout(() => {
            try {
              if (fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
              }
            } catch (cleanupError) {
              console.error('Error al limpiar archivo de audio:', cleanupError);
            }
          }, 1000);
          
          return;
        }
      }

      // Si llegamos aquí, ninguno funcionó
      throw new Error('No se pudo generar el audio con ningún motor TTS');

    } catch (ttsError) {
      // Limpiar archivo si existe
      try {
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
      } catch (cleanupError) {
        // Ignorar errores de limpieza
      }

      const errorMsg = ttsError.message || '';
      console.error('Error al generar audio TTS:', errorMsg);

      // Dar instrucciones de instalación según el sistema
      const isWindows = process.platform === 'win32';
      const isLinux = process.platform === 'linux';

      if (isLinux) {
        return res.status(500).json({ 
          error: 'No se encontró un motor TTS instalado. Instala uno con: sudo apt-get install espeak espeak-data libttspico-utils',
          details: errorMsg,
          suggestion: 'Para mejor calidad en español: sudo apt-get install libttspico-utils'
        });
      } else if (isWindows) {
        return res.status(500).json({ 
          error: 'TTS no disponible en Windows. Considera usar speechSynthesis del navegador o instalar un motor TTS.',
          details: errorMsg
        });
      } else {
        return res.status(500).json({ 
          error: 'No se pudo generar el audio. Asegúrate de tener un motor TTS instalado.',
          details: errorMsg
        });
      }
    }

  } catch (error) {
    console.error('Error en synthesizeSpeech:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

