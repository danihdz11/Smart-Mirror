// src/voice/voiceCommands.ts
import { getWeather, type WeatherData } from "../../services/api";


export type CommandContext = {
  locationPath: string;
  speak: (text: string) => Promise<void> | void;
  navigate: (path: string) => void;
  stopListening: () => void;
  startListening: () => void;
  fetchNewsAndRead: () => Promise<void> | void;
  resetWelcomeFlags: () => void;
  refreshTasks?: () => void;
};

export type VoiceCommand = {
  name: string;
  match: (normalized: string, ctx: CommandContext) => boolean;
  execute: (normalized: string, ctx: CommandContext) => Promise<void> | void;
};

// ============================
//  Lista de comandos
// ============================

const voiceCommands: VoiceCommand[] = [
  // Agregar tarea
  {
    name: "agregar_tarea",
    match: (normalized, _ctx) => {
      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      // Frases que activan el comando
      return (
        clean.startsWith("agrega tarea") ||
        clean.startsWith("agregar tarea") ||
        clean.startsWith("añade tarea") ||
        clean.startsWith("anade tarea") || // por si falla la ñ
        clean.startsWith("nueva tarea")
      );
    },
    execute: async (normalized, ctx) => {
      ctx.stopListening();

      // ======================
      // 1) Limpiar texto y extraer título
      // ======================
      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      const triggers = [
        "agrega tarea",
        "agregar tarea",
        "añade tarea",
        "anade tarea",
        "nueva tarea",
      ];

      let title = "";

      for (const t of triggers) {
        if (clean.startsWith(t)) {
          title = clean.substring(t.length).trim();
          break;
        }
      }

      if (!title) {
        await ctx.speak(
          "Para guardar una tarea, di por ejemplo: agrega tarea comprar leche."
        );
        setTimeout(() => ctx.startListening(), 1000);
        return;
      }

      // ======================
      // 2) Obtener usuario
      // ======================
      let userId: string | null = null;

      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user.id || user._id; // depende de cómo lo guardes
        }
      } catch (err) {
        console.error("Error leyendo usuario:", err);
      }

      if (!userId) {
        await ctx.speak("No encontré un usuario activo. Inicia sesión primero.");
        setTimeout(() => ctx.startListening(), 1000);
        return;
      }

      // ======================
      // 3) Hacer POST al backend
      // ======================
      try {
        const res = await fetch("http://localhost:5001/api/tasks/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            title,
            date: null,
            time: null,
            repeat: "none",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("Error al agregar tarea:", data);
          await ctx.speak("No pude guardar la tarea, intenta de nuevo.");
        } else {
          console.log("Tarea agregada:", data);
          await ctx.speak(`He guardado la tarea: ${title}.`);

          // Si conectas esto con tu widget:
          if (ctx.refreshTasks) {
            ctx.refreshTasks();
          }
        }
      } catch (err) {
        console.error("Error de red al agregar tarea:", err);
        await ctx.speak("Hubo un problema con el servidor de tareas.");
      }

      setTimeout(() => ctx.startListening(), 1000);
    },
  },

  // 📰 Leer noticias en /mirror
  {
    name: "leer_noticias",
    match: (normalized, ctx) => {
      if (ctx.locationPath !== "/mirror") return false;

      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      return (
        clean.includes("dime las noticias") ||
        clean.includes("dime las noticia") ||
        clean.includes("lee las noticias") ||
        clean.includes("lee las noticia") ||
        clean.includes("cuentame las noticias") ||
        clean.includes("cuéntame las noticias")
      );
    },
    execute: async (_normalized, ctx) => {
      console.log("📰 Comando: leer noticias");
      ctx.stopListening();
      await ctx.fetchNewsAndRead();
    },
  },

  // 🚪 Logout / salir en /mirror
  {
    name: "logout",
    match: (normalized, ctx) => {
      if (ctx.locationPath !== "/mirror") return false;

      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      return (
        clean.includes("salir") ||
        clean.includes("cerrar sesion") ||
        clean.includes("cerrar sesión") ||
        clean.includes("logout") ||
        clean.includes("adios") ||
        clean.includes("adiós") ||
        clean.includes("desconectar")
      );
    },
    execute: async (_normalized, ctx) => {
      console.log("🚪 Comando: cerrar sesión");

      ctx.stopListening();

      localStorage.removeItem("user");
      localStorage.removeItem("token");

      window.dispatchEvent(new CustomEvent("userLogout"));
      ctx.resetWelcomeFlags();

      await ctx.speak("Sesión cerrada. Hasta luego.");

      setTimeout(() => {
        ctx.startListening();
      }, 3000);
    },
  },

  // 🔐 Comando para ir al login desde cualquier ruta
  {
    name: "ir_a_login",
    match: (normalized, ctx) => {
      if (ctx.locationPath === "/login") return false;

      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      const loginPatterns = [
        "quiero iniciar sesion",
        "quiero iniciar sesión",
        "iniciar sesion",
        "iniciar sesión",
        "inicia sesion",
        "inicia sesión",
        "quiero iniciar",
        "iniciar",
        "login",
        "loguear",
        "loguearme",
      ];

      return loginPatterns.some((pattern) => clean.includes(pattern));
    },
    execute: async (_normalized, ctx) => {
      console.log("✅ Comando: ir a /login");
      ctx.stopListening();
      ctx.navigate("/login");
    },
  },

{
  name: "saludo_custom",
  match: (normalized, _ctx) => {
    const clean = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return clean.includes("elsa");
  },
  execute: async (_normalized, ctx) => {
    ctx.stopListening();
    await ctx.speak("PATO");
    setTimeout(() => ctx.startListening(), 1000);
  },
},

{
  name: "madre",
  match: (normalized, _ctx) => {
    const clean = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return clean.includes("chinga tu madre");
  },
  execute: async (_normalized, ctx) => {
    ctx.stopListening();
    await ctx.speak("la tuya en vinagre");
    setTimeout(() => ctx.startListening(), 1000);
  },
},

{
  name: "decir_hora",
  match: (normalized, _ctx) => {
    const clean = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return (
      clean.includes("hora") ||
      clean.includes("qué hora es") ||
      clean.includes("qué hora son") ||
      clean.includes("que hora es")
    );
  },
  execute: async (_normalized, ctx) => {
    const now = new Date();

    // Convierte la hora a formato local (ejemplo: "3:45 PM")
    const horaFormateada = now.toLocaleTimeString("es-MX", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    ctx.stopListening();
    await ctx.speak(`La hora actual es ${horaFormateada}`);
    setTimeout(() => ctx.startListening(), 1000);
  },
},

{
  name: "chiste_api",
  match: (normalized, _ctx) => {
    const clean = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    // Frases que activan el comando
    return (
      clean.includes("chiste") ||          // "cuenta un chiste", "dime un chiste"
      clean.includes("cuentame un chiste") ||
      clean.includes("cuéntame un chiste") ||
      clean.includes("hazme reir") ||
      clean.includes("hazme reír")
    );
  },
  execute: async (_normalized, ctx) => {
    try {
      // API pública de chistes, en español y modo "seguro"
      const res = await fetch(
        "https://v2.jokeapi.dev/joke/Any?lang=es&safe-mode"
      );

      const data = await res.json();

      let joke = "";

      if (data.type === "single") {
        // Chiste de una sola parte
        joke = data.joke;
      } else {
        // Chiste con setup + remate
        joke = `${data.setup} ... ${data.delivery}`;
      }

      ctx.stopListening();
      await ctx.speak(joke || "No pude encontrar un chiste en este momento.");

      setTimeout(() => {
        ctx.startListening();
      }, 1000);
    } catch (error) {
      console.error("Error obteniendo chiste:", error);
      ctx.stopListening();
      await ctx.speak("No pude obtener un chiste ahora mismo, intenta más tarde.");
      setTimeout(() => {
        ctx.startListening();
      }, 1000);
    }
  },
},

{
  name: "clima_usuario",
  match: (normalized, _ctx) => {
    const clean = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return (
      clean.includes("clima") ||
      clean.includes("tiempo") ||
      clean.includes("que clima hace") ||
      clean.includes("qué clima hace") ||
      clean.includes("como está el clima") ||
      clean.includes("cómo está el clima") ||
      clean.includes("dime el clima") ||
      clean.includes("dime el tiempo")
    );
  },
  execute: async (_normalized, ctx) => {
    ctx.stopListening();

    // ======================
    // 1) Obtener ciudad según tu lógica actual
    // ======================
    let city = "Guadalajara"; // valor por defecto
    let country = "MX";

    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        // Igual que en tu WeatherWidget: usa user.location si existe
        if (user.location) {
          city = user.location;
        }
      }
    } catch (e) {
      console.error("Error parsing user from localStorage, usando valores por defecto:", e);
    }

    try {
      // ======================
      // 2) Llamar a tu servicio getWeather (ya usa OpenWeather por dentro)
      // ======================
      const data: WeatherData = await getWeather(city, country);

      const temperatura = Math.round(data.temperature);
      const descripcion = data.description || data.weatherType || "clima desconocido";
      const ciudadFinal = data.city || city;

      // ======================
      // 3) Frase que va a decir el asistente
      // ======================
      const frase = `El clima en ${ciudadFinal} es ${descripcion}. La temperatura actual es de ${temperatura} grados centígrados.`;

      await ctx.speak(frase);
    } catch (err: any) {
      console.error("Error obteniendo clima:", err);
      const msg =
        err?.response?.data?.error ||
        "No pude obtener el clima en este momento.";
      await ctx.speak(msg);
    }

    setTimeout(() => {
      ctx.startListening();
    }, 1000);
  },
},

{
  name: "dia_hoy",
  match: (normalized, _ctx) => {
    const clean = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return (
      clean.includes("dia es hoy") ||      // qué día es hoy
      clean.includes("día es hoy") ||
      clean.includes("que dia es") ||
      clean.includes("qué día es") ||
      clean.includes("fecha de hoy") ||
      clean.includes("dime la fecha") ||
      clean.includes("que fecha es")
    );
  },
  execute: async (_normalized, ctx) => {
    ctx.stopListening();

    // ======================
    // Obtener fecha actual
    // ======================
    const hoy = new Date();

    // Día de la semana y fecha en español
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    const fechaFormateada = hoy.toLocaleDateString("es-MX", opciones);

    await ctx.speak(`Hoy es ${fechaFormateada}`);

    setTimeout(() => {
      ctx.startListening();
    }, 800);
  },
},



];

// ============================
//  Función pública
// ============================

export function handleVoiceCommands(
  transcript: string,
  ctx: CommandContext
): boolean {
  const clean = transcript
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  for (const cmd of voiceCommands) {
    if (cmd.match(clean, ctx)) {
      cmd.execute(clean, ctx);
      return true;
    }
  }

  return false;
}
