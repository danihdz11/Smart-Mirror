import pyttsx3
import speech_recognition as sr
import pywhatkit
import webbrowser
import datetime
import wikipedia
from pyowm import OWM
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

# opciones de voz/idioma
id1 = r'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices\Tokens\TTS_MS_ES-MX_SABINA_11.0'
id2 = r'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices\Tokens\TTS_MS_EN-US_ZIRA_11.0'


# escuchar microfono y devolver el audio como texto
def tranformar_audio_en_texto():

    # alamacenar recognizer en variable
    r = sr.Recognizer()

    # configurar el microfono
    with sr.Microphone() as origen:

        # tiempo de espera
        r.pause_threshold = 0.8

        # informar que comenzo la grabación
        print('ya puedes hablar')

        # guardar lo que escuche como audio
        audio = r.listen(origen)

        try:
            # buscar en google
            pedido = r.recognize_google(audio, language="es-mx")

            # prueba de que pudo ingresar
            print("Dijiste: " + pedido)

            # devolver a pedido
            return pedido

        # en caso de que no comprenda el audio
        except sr.UnknownValueError:

            # prueba de que no comprendió el audio
            print("ups, no entendí")

            # devolver error
            return "sigo esperando"

        # en caso de no poder resolver el pedido
        except sr.RequestError:

            # prueba de que no comprendió el audio
            print("ups, no hay servicio")

            # devolver error
            return "sigo esperando"

        # error inesperado
        except:

            # prueba de que no comprendió el audio
            print("ups, algo ha salido mal")

            # devolver error
            return "sigo esperando"


# funcion para el que asistente pueda ser escuchado
def hablar(mensaje):

    # encender el motor de pyttsx3
    engine = pyttsx3.init()
    engine.setProperty('voice', id1)

    # pronunciar mensaje
    engine.say(mensaje)
    engine.runAndWait()


# informar el día de la semana
def pedir_dia():

    # crear varibale con datos de hoy
    dia = datetime.date.today()
    print(dia)

    # crear una variable para el dia de la semana
    dia_semana = dia.weekday()
    print(dia_semana)

    # diccionario con nombre de los dias
    calendario = {0: 'Lunes',
                  1: 'Martes',
                  2: 'Miércoles',
                  3: 'Jueves',
                  4: 'Viernes',
                  5: 'Sábado',
                  6: 'Domimgo'}

    # decir el dia de la semana
    hablar(f'Hoy es {calendario[dia_semana]}')


# informar que hora es
def pedir_hora():

    # crear variable con datos de la hora
    hora = datetime.datetime.now()
    hora = f'En este momento son las {hora.hour} horas con {hora.minute} minutos y {hora.second} segundos'
    print(hora)

    # decir la hora
    hablar(hora)


# informar el clima actual
def pedir_clima():
    try:
        # Obtener API key del archivo .env
        api_key = os.getenv('OPENWEATHER_API_KEY')
        ciudad = os.getenv('CIUDAD', 'Guadalajara')
        pais = os.getenv('PAIS', 'MX')
        
        if not api_key:
            hablar('No se encontró la API key del clima. Por favor configura tu archivo .env')
            return
            
        # Inicializar OpenWeatherMap
        owm = OWM(api_key)
        mgr = owm.weather_manager()
        
        # Obtener clima de la ciudad
        observation = mgr.weather_at_place(f'{ciudad},{pais}')
        w = observation.weather
        
        # Extraer información
        temperatura = w.temperature('celsius')['temp']
        descripcion = w.detailed_status
        humedad = w.humidity
        
        # Crear mensaje
        mensaje = f'En {ciudad} la temperatura es de {temperatura} grados centígrados, está {descripcion} y la humedad es del {humedad} por ciento'
        
        print(mensaje)
        hablar(mensaje)
        
    except Exception as e:
        print(f'Error al obtener el clima: {e}')
        hablar('Lo siento, no pude obtener la información del clima en este momento')


# funcion saludo inicial
def saludo_inicial():

    # cear variabales con datos hora
    hora = datetime.datetime.now()
    if hora.hour < 6 or hora.hour > 20:
        momento = 'Buenas noches'
    elif 6 <= hora.hour < 13:
        momento = 'Buenos días'
    else:
        momento = 'Buenas tardes'

    # decir saludo
    hablar(f'{momento}, soy Rebeca, tu asistente de Smart Mirror. Cualquier cosa estoy al pendiente')


# funcion central del asistente
def pedir_cosas():

    # activar saludo inicial
    saludo_inicial()

    # variable de corte
    comenzar = True

    # loop central
    while comenzar:

        # activar el microfono y guardar el pedido en un string
        pedido = tranformar_audio_en_texto().lower()

        if 'qué día es hoy' in pedido:
            pedir_dia()
            continue
        elif 'qué hora es' in pedido:
            pedir_hora()
            continue
        elif 'busca en wikipedia' in pedido:
            hablar('Buscando en wikipedia')
            pedido = pedido.replace('busca en wikipedia', '')
            wikipedia.set_lang('es')
            resultado = wikipedia.summary(pedido, sentences=1)
            hablar('Wikipedia dice lo siguiente:')
            hablar(resultado)
            continue
        elif 'busca en internet' in pedido:
            hablar('Por supuesto, dame un segundo en lo que lo encuentro')
            pedido = pedido.replace('busca en internet', '')
            pywhatkit.search(pedido)
            hablar('Esto es lo que he encontrado')
            continue
        elif 'adiós' in pedido:
            hablar('Me voy a descansar, cualquier cosa házmelo saber')
            break
        elif 'muchas gracias' in pedido:
            hablar('Es un gusto poder ayudar. Para apagarme di la palabra adiós')
            continue
        elif 'espejito espejito' in pedido:
            # aqui se conecta con la base de datos para obtener el nombre real del usuario
            nombre_usuario = "Daniel"  # Nombre temporal
            hablar(f'Hola {nombre_usuario}, dime, ¿En qué te puedo ayudar?')
            continue
        elif 'mis hábitos' in pedido or 'mis habitos' in pedido:
            hablar('Aquí tienes un resumen de tus hábitos de hoy. Recuerda beber agua y hacer ejercicio.')
            continue
        elif 'mi calendario' in pedido:
            hablar('Tu próxima cita es mañana a las 10 de la mañana.')
            continue
        elif 'el clima' in pedido or 'clima' in pedido:
            pedir_clima()
            continue
        elif 'quiero escuchar música' in pedido or 'reproduce música' in pedido:
            hablar('Por supuesto, dime qué canción quieres escuchar')
            # Esperar a que el usuario diga la canción
            cancion = tranformar_audio_en_texto().lower()
            if cancion != "sigo esperando":
                hablar(f'Perfecto, reproduciendo {cancion}')
                pywhatkit.playonyt(cancion)
            continue
        elif 'reproduce' in pedido:
            # Extraer la canción del comando
            cancion = pedido.replace('reproduce', '').strip()
            if cancion:
                hablar(f'Reproduciendo {cancion}')
                pywhatkit.playonyt(cancion)
            continue


pedir_cosas()
