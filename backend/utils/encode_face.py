import json
import sys
from pathlib import Path

import face_recognition


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        return 1

    image_path = Path(sys.argv[1]).expanduser().resolve()

    if not image_path.exists():
        print(json.dumps({"error": f"Image not found: {image_path}"}))
        return 1

    try:
        image = face_recognition.load_image_file(str(image_path))
        encodings = face_recognition.face_encodings(image)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": f"Processing error: {exc}"}))
        return 1

    if not encodings:
        print(json.dumps({"error": "No face detected"}))
        return 2

    print(json.dumps({"encoding": encodings[0].tolist()}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

