import json
import sys
import numpy as np
import face_recognition

def main() -> int:
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: compare_face.py <image_path> <known_encoding_json}"}))
        return 1

    image_path = sys.argv[1]
    known_encoding_json = sys.argv[2]

    try:
        # Cargar imagen y generar encoding
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)
        
        if not face_encodings:
            print(json.dumps({"error": "No face detected in image"}))
            return 2

        unknown_encoding = face_encodings[0]

        # Parsear encoding conocido
        try:
            known_encoding = json.loads(known_encoding_json)
            known_encoding = np.array(known_encoding)
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON encoding"}))
            return 1

        # Comparar encodings
        distance = face_recognition.face_distance([known_encoding], unknown_encoding)[0]
        tolerance = 0.6  # Umbral de tolerancia (ajustable)
        match = distance <= tolerance

        print(json.dumps({
            "match": bool(match),
            "distance": float(distance),
            "tolerance": tolerance
        }))
        return 0

    except Exception as exc:
        print(json.dumps({"error": f"Processing error: {exc}"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

