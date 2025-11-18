from flux_led import WifiLedBulb
import sys, time

LED_IP = "192.168.1.69"  # tu IP

led = WifiLedBulb(LED_IP)

def turn_on(brightness=80):
    """Enciende luz cálida con brillo 0–100."""
    led.turnOn()
    time.sleep(0.5)  # pequeño delay para que acepte comandos
    # Brillo se pasa como kwarg a setRgb en versiones recientes
    led.setRgb(255, 160, 60, brightness=brightness)  # cálido tipo foco
    print(f"💡 Encendido cálido (brillo {brightness}%)")

def turn_off():
    led.turnOff()
    print("🌙 Apagado")

if __name__ == "_main_":
    if len(sys.argv) < 2:
        print("Uso: python led_control.py [on <brillo 0-100>|off]")
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "on":
        b = 80
        if len(sys.argv) >= 3:
            try:
                b = max(0, min(100, int(sys.argv[2])))
            except ValueError:
                pass
        turn_on(b)
    elif cmd == "off":
        turn_off()
    else:
        print("Comando no reconocido. Usa: on [brillo] | off")