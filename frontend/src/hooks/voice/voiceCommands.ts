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

type PendingTaskState = {
  step: "awaitingTitle" | "awaitingDate";
  tempTitle?: string;
};

let pendingTask: PendingTaskState | null = null;


function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0"); // 0-11
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateFromText(text: string): string | null {
  const now = new Date();

  let clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos -> mañana => manana
    .toLowerCase()
    .trim();

  // sin fecha
  if (clean.includes("sin fecha")) {
    return null;
  }

  // hoy
  if (clean.includes("hoy")) {
    return formatLocalDate(now);
  }

  // pasado mañana (checar antes que "mañana")
  if (clean.includes("pasado manana")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return formatLocalDate(d);
  }

  // mañana
  if (clean.includes("manana")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  }

  // formato dd/mm o dd-mm
  const regexDdMm = /(\d{1,2})[\/\-](\d{1,2})/;
  const m1 = clean.match(regexDdMm);
  if (m1) {
    const day = m1[1];
    const month = m1[2];
    const year = now.getFullYear();
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // formato yyyy-mm-dd
  const regexIso = /(\d{4})-(\d{2})-(\d{2})/;
  const m2 = clean.match(regexIso);
  if (m2) {
    return m2[0];
  }

  // no se entendió la fecha
  return null;
}



export type VoiceCommand = {
  name: string;
  match: (normalized: string, ctx: CommandContext) => boolean;
  execute: (normalized: string, ctx: CommandContext) => Promise<void> | void;
};

function extractDateFromText(text: string) {
  const now = new Date();

  const format = (date: Date) => date.toISOString().split("T")[0];

  let date: string | null = null;

  // --- HOY ---
  if (text.includes("hoy")) {
    date = format(now);
    text = text.replace("hoy", "").trim();
  }

  // --- MAÑANA ---
  if (text.includes("mañana")) {
    const d = new Date();
    d.setDate(now.getDate() + 1);
    date = format(d);
    text = text.replace("mañana", "").trim();
  }

  // --- PASADO MAÑANA ---
  if (text.includes("pasado mañana")) {
    const d = new Date();
    d.setDate(now.getDate() + 2);
    date = format(d);
    text = text.replace("pasado mañana", "").trim();
  }

  // --- FORMATO dd/mm ---
  const regex1 = /(\d{1,2})\/(\d{1,2})/;
  const match1 = text.match(regex1);
  if (match1) {
    const [_, d, m] = match1;
    const year = now.getFullYear();
    date = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    text = text.replace(regex1, "").trim();
  }

  // --- FORMATO yyyy-mm-dd ---
  const regex2 = /(\d{4})-(\d{2})-(\d{2})/;
  const match2 = text.match(regex2);
  if (match2) {
    date = match2[0];
    text = text.replace(regex2, "").trim();
  }

  return { title: text.trim(), date };
}

// ============================
//  Lista de comandos
// ============================

const voiceCommands: VoiceCommand[] = [
  {
    name: "agregar_tarea_iniciar",
    match: (normalized, _ctx) => {
      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      return (
        clean.startsWith("agrega tarea") ||
        clean.startsWith("agregar tarea") ||
        clean.startsWith("añade tarea") ||
        clean.startsWith("anade tarea") ||
        clean.startsWith("nueva tarea")
      );
    },
    execute: async (normalized, ctx) => {
      ctx.stopListening();

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

      let rest = clean;
      for (const t of triggers) {
        if (rest.startsWith(t)) {
          rest = rest.slice(t.length).trim();
          break;
        }
      }

      // Caso 1: solo dijo "agregar tarea"
      if (!rest) {
        pendingTask = { step: "awaitingTitle" };
        await ctx.speak("¿Cuál es el nombre de la tarea?");
        setTimeout(() => ctx.startListening(), 800);
        return;
      }

      // Caso 2: dijo título en la misma frase
      pendingTask = {
        step: "awaitingDate",
        tempTitle: rest, // ej. "comprar leche mañana" lo refinará el siguiente paso
      };

      await ctx.speak(
        `Entendido. La tarea es: ${rest}. ¿Para qué fecha es esta tarea? Puedes decir hoy, mañana o una fecha como 25/02. Si no quieres fecha, di sin fecha.`
      );
      setTimeout(() => ctx.startListening(), 800);
    },
  },

  {
  name: "agregar_tarea_titulo",
  match: (normalized, _ctx) => {
    if (!pendingTask || pendingTask.step !== "awaitingTitle") return false;

    const clean = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    return clean.length > 0;
  },
  execute: async (normalized, ctx) => {
    ctx.stopListening();

    const title = normalized.trim();
    pendingTask = {
      step: "awaitingDate",
      tempTitle: title,
    };

    await ctx.speak(
      `Perfecto. Guardaré la tarea: ${title}. ¿Para qué fecha es esta tarea? Puedes decir hoy, mañana o una fecha como 25 barra 11. Si no quieres fecha, di sin fecha.`
    );

    setTimeout(() => ctx.startListening(), 800);
  },
},

  {
  name: "agregar_tarea_fecha",
  match: (normalized, _ctx) => {
    if (!pendingTask || pendingTask.step !== "awaitingDate") return false;

    const clean = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    return clean.length > 0;
  },
  execute: async (normalized, ctx) => {
    ctx.stopListening();

    if (!pendingTask || !pendingTask.tempTitle) {
      // algo se desincronizó, reiniciamos flujo
      await ctx.speak(
        "Algo salió mal al crear la tarea. Intenta de nuevo diciendo agregar tarea."
      );
      pendingTask = null;
      setTimeout(() => ctx.startListening(), 1000);
      return;
    }

    const title = pendingTask.tempTitle;
    const rawDatePhrase = normalized;

    // detectar fecha (o sin fecha)
    const date = parseDateFromText(rawDatePhrase);

    if (date === null && !rawDatePhrase.toLowerCase().includes("sin fecha")) {
      await ctx.speak(
        "No entendí la fecha. Intenta decir hoy, mañana, una fecha como 25 barra 11 o di sin fecha."
      );
      // seguimos en awaitingDate
      setTimeout(() => ctx.startListening(), 1200);
      return;
    }

    // obtener usuario
    let userId: string | null = null;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id || user._id;
      }
    } catch (e) {
      console.error("Error leyendo usuario:", e);
    }

    if (!userId) {
      await ctx.speak("Necesitas iniciar sesión para guardar tareas.");
      pendingTask = null;
      setTimeout(() => ctx.startListening(), 1000);
      return;
    }

    try {
      const res = await fetch("http://localhost:5001/api/tasks/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title,
          date: date || null,
          time: null,
          repeat: "none",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Error al agregar tarea:", data);
        await ctx.speak("No pude guardar la tarea, intenta de nuevo.");
      } else {
        if (date) {
          await ctx.speak(
            `He guardado la tarea: ${title} para la fecha ${date}.`
          );
        } else {
          await ctx.speak(`He guardado la tarea: ${title} sin fecha.`);
        }

        if (ctx.refreshTasks) {
          ctx.refreshTasks();
        }
      }
    } catch (e) {
      console.error("Error de red al agregar tarea:", e);
      await ctx.speak("Hubo un problema con el servidor de tareas.");
    }

    pendingTask = null;
    setTimeout(() => ctx.startListening(), 1000);
  },
},


  // Agregar tarea
  {
    name: "agregar_tarea",

    match: (normalized, _ctx) => {
      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      return (
        clean.startsWith("agrega tarea") ||
        clean.startsWith("agregar tarea") ||
        clean.startsWith("añade tarea") ||
        clean.startsWith("anade tarea") ||
        clean.startsWith("nueva tarea")
      );
    },

    execute: async (normalized, ctx) => {
      ctx.stopListening();

      // ======================
      // 1) Limpiar texto
      // ======================
      const clean = normalized
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().trim();

      const triggers = [
        "agrega tarea",
        "agregar tarea",
        "añade tarea",
        "anade tarea",
        "nueva tarea",
      ];

      let text = clean;
      for (const t of triggers) {
        if (text.startsWith(t)) {
          text = text.slice(t.length).trim();
        }
      }

      if (!text) {
        await ctx.speak("Para guardar una tarea, di por ejemplo: agrega tarea comprar leche mañana.");
        setTimeout(() => ctx.startListening(), 1000);
        return;
      }

      // ======================
      // 2) Extraer fecha
      // ======================
      const { title, date } = extractDateFromText(text);

      // ======================
      // 3) Obtener usuario
      // ======================
      let userId = null;
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user.id || user._id;
        }
      } catch (e) {
        console.error("Error leyendo usuario:", e);
      }

      if (!userId) {
        await ctx.speak("Necesitas iniciar sesión para guardar tareas.");
        setTimeout(() => ctx.startListening(), 1000);
        return;
      }

      // ======================
      // 4) Guardar la tarea
      // ======================
      try {
        const res = await fetch("http://localhost:5001/api/tasks/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            title,
            date: date || null,
            time: null,
            repeat: "none",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("Error al agregar tarea:", data);
          await ctx.speak("No pude guardar la tarea, intenta de nuevo.");
        } else {
          await ctx.speak(
            date
              ? `He guardado la tarea: ${title} para el ${date}.`
              : `He guardado la tarea: ${title}.`
          );

          if (ctx.refreshTasks) ctx.refreshTasks();
        }
      } catch (err) {
        console.error("Error de red al agregar tarea:", err);
        await ctx.speak("Hubo un problema con el servidor de tareas.");
      }

      setTimeout(() => ctx.startListening(), 1000);
    },
  },

  // Eliminar tarea
  {
    name: "eliminar_tarea",
    match: (normalized, _ctx) => {
      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      // Formato esperado: "eliminar tarea: {nombre}" (con o sin dos puntos)
      return clean.startsWith("eliminar tarea");
    },
    execute: async (normalized, ctx) => {
      ctx.stopListening();

      // 1) Limpiar y extraer título
      const clean = normalized
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      // Quitar "eliminar tarea" + posibles ":" y espacios
      let titleSpoken = clean.replace(/^eliminar tarea[:]?/i, "").trim();

      if (!titleSpoken) {
        await ctx.speak(
          "Para borrar una tarea, di por ejemplo: eliminar tarea entregar proyecto de física."
        );
        setTimeout(() => ctx.startListening(), 1000);
        return;
      }

      // 2) Obtener usuario
      let userId: string | null = null;

      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user.id || user._id;
        }
      } catch (err) {
        console.error("Error leyendo usuario:", err);
      }

      if (!userId) {
        await ctx.speak("No encontré un usuario activo. Inicia sesión primero.");
        setTimeout(() => ctx.startListening(), 1000);
        return;
      }

      // Helper para normalizar títulos
      const normalizeTitle = (text: string) =>
        text
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();

      const target = normalizeTitle(titleSpoken);

      try {
        // 3) Traer tareas actuales
        const tasksRes = await fetch(
          `http://localhost:5001/api/tasks/${userId}`
        );
        const tasksData = await tasksRes.json();

        if (!tasksRes.ok) {
          console.error("Error obteniendo tareas:", tasksData);
          await ctx.speak("No pude obtener tus tareas para borrarla.");
          setTimeout(() => ctx.startListening(), 1000);
          return;
        }

        const tasks = (tasksData.tasks || []) as { title: string }[];

        if (tasks.length === 0) {
          await ctx.speak("No tienes tareas para eliminar.");
          setTimeout(() => ctx.startListening(), 1000);
          return;
        }

        // 4) Buscar tarea por nombre
        let index = tasks.findIndex(
          (t) => normalizeTitle(t.title) === target
        );

        // Si no hay match exacto, intentar por "incluye"
        if (index === -1) {
          index = tasks.findIndex((t) =>
            normalizeTitle(t.title).includes(target)
          );
        }

        if (index === -1) {
          await ctx.speak(
            `No encontré ninguna tarea llamada ${titleSpoken}.`
          );
          setTimeout(() => ctx.startListening(), 1000);
          return;
        }

        const titleToDelete = tasks[index].title;

        // 5) Llamar al delete del backend
        const deleteRes = await fetch(
          "http://localhost:5001/api/tasks/delete",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              index,
            }),
          }
        );

        const deleteData = await deleteRes.json();

        if (!deleteRes.ok) {
          console.error("Error al eliminar tarea:", deleteData);
          await ctx.speak("No pude eliminar la tarea, intenta de nuevo.");
        } else {
          await ctx.speak(`He eliminado la tarea: ${titleToDelete}.`);

          if (ctx.refreshTasks) {
            ctx.refreshTasks();
          }
        }
      } catch (err) {
        console.error("Error de red al eliminar tarea:", err);
        await ctx.speak(
          "Hubo un problema con el servidor al intentar eliminar la tarea."
        );
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