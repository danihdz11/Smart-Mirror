from flux_led import BulbScanner

scanner = BulbScanner()
devices = scanner.scan(timeout=8)

if not devices:
    print("❌ No se detectó ningún controlador. Verifica que esté encendido y en la misma red Wi-Fi.")
else:
    print("✅ Dispositivos encontrados:\n")
    for d in devices:
        ip = d.get("ipaddr", "desconocido")
        model = d.get("model", "desconocido")
        id = d.get("id", "sin ID")
        print(f"💡 IP: {ip} — Modelo: {model} — ID: {id}")