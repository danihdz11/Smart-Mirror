import cv2
import face_recognition
import numpy as np
import os
import time

# ==== CONFIGURACIÓN INICIAL ====
path = 'Employees'  # carpeta con las imágenes conocidas
images = []
classNames = []

# Carga de imágenes de referencia
for cls in os.listdir(path):
    curImg = cv2.imread(f'{path}/{cls}')
    if curImg is not None:
        images.append(curImg)
        classNames.append(os.path.splitext(cls)[0])

print("Empleados cargados:", classNames)


# ==== FUNCIONES AUXILIARES ====
def findEncodings(images_list):
    encodings = []
    for img in images_list:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        enc = face_recognition.face_encodings(img)
        if len(enc) > 0:
            encodings.append(enc[0])
        else:
            print("⚠️ No se encontró rostro en una de las imágenes de Employees.")
    return encodings


# ==== PROCESAMIENTO DE REFERENCIA ====
encodeListKnown = findEncodings(images)

if len(encodeListKnown) == 0:
    print("❌ No hay codificaciones válidas. Revisa las fotos en 'Employees'.")
    exit()

print('✅ Codificación completa, cámara iniciando...')

# ==== INICIO DE CÁMARA ====
# Usamos el mismo backend que funcionó en tu test_cam
cap = cv2.VideoCapture(0, cv2.CAP_V4L2)

if not cap.isOpened():
    print("❌ Error: no se pudo abrir la cámara. Revisa /dev/video0 y permisos.")
    exit()

print("🎥 Cámara lista. Presiona 'q' para salir.")

# Diccionario para controlar el delay por persona
last_detection_time = {}
DELAY_SECONDS = 10  # segundos entre detecciones "válidas" por persona

# ==== LOOP PRINCIPAL ====
while True:
    success, img = cap.read()

    if not success or img is None:
        print("⚠️ Error: no se pudo capturar imagen del dispositivo")
        break

    # Reducción para procesar más rápido
    imgS = cv2.resize(img, (0, 0), fx=0.25, fy=0.25)
    rgbS = cv2.cvtColor(imgS, cv2.COLOR_BGR2RGB)

    # Detección y codificación en frame actual
    facesCurFrame = face_recognition.face_locations(rgbS)
    encodesCurFrame = face_recognition.face_encodings(rgbS, facesCurFrame)

    for encodeFace, faceLoc in zip(encodesCurFrame, facesCurFrame):
        matches = face_recognition.compare_faces(encodeListKnown, encodeFace)
        faceDis = face_recognition.face_distance(encodeListKnown, encodeFace)

        if len(faceDis) == 0:
            continue

        matchIndex = np.argmin(faceDis)

        if matches[matchIndex]:
            name = classNames[matchIndex].upper()

            # Escalar coordenadas al tamaño original
            y1, x2, y2, x1 = faceLoc
            y1, x2, y2, x1 = y1 * 4, x2 * 4, y2 * 4, x1 * 4

            # Siempre dibujamos recuadro y nombre mientras esté presente
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.rectangle(img, (x1, y2 - 35), (x2, y2),
                          (0, 255, 0), cv2.FILLED)
            cv2.putText(img, name, (x1 + 6, y2 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 1,
                        (255, 255, 255), 2)

            # Control de delay para "detección válida"
            current_time = time.time()
            last_time = last_detection_time.get(name, 0)

            if current_time - last_time >= DELAY_SECONDS:
                last_detection_time[name] = current_time
                print(f"Hola {name}")

                # 🔹 Aquí es donde después puedes:
                # - Guardar en CSV
                # - Enviar a BD
                # - Imprimir en pantalla
                # sin que se repita a cada frame

        # Si no hay match, puedes opcionalmente dibujar algo para "Desconocido"
        # else:
        #     y1, x2, y2, x1 = faceLoc
        #     y1, x2, y2, x1 = y1 * 4, x2 * 4, y2 * 4, x1 * 4
        #     cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 2)
        #     cv2.putText(img, "UNKNOWN", (x1 + 6, y2 - 6),
        #                 cv2.FONT_HERSHEY_SIMPLEX, 1,
        #                 (255, 255, 255), 2)

    cv2.imshow("Attendance", img)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
