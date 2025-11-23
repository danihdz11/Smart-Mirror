import React, { useEffect, useState } from "react";

interface Task {
  title: string;
  date?: string | null;
  time?: string | null;
  repeat?: string;
}

interface TodoWidgetProps {
  refresh: number;
}

const TodoWidget: React.FC<TodoWidgetProps> = ({ refresh }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!) : null
  );

  // Obtener usuario actual
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  // ================================
  // Obtener tareas desde backend
  // ================================
  const fetchTasks = async () => {
    try {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://localhost:5001/api/tasks/${currentUser.id}`
      );

      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks || []);
      } else {
        console.error("Error fetching tasks:", data.message);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cuando refresh cambie → refrescar tareas
  useEffect(() => {
    fetchTasks();
  }, [refresh]);

  // Detectar cambios en localStorage (logout/login)
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem("user");
      const parsed = stored ? JSON.parse(stored) : null;

      // Si hubo cambio real → actualizar estado
      if (
        (parsed && !currentUser) ||
        (!parsed && currentUser) ||
        (parsed && currentUser && parsed.id !== currentUser.id)
      ) {
        setCurrentUser(parsed);
        setTasks([]); // limpiar tareas inmediatamente
        setLoading(true);
        fetchTasks(); // recargar tareas
      }
    }, 500); // revisa 2 veces por segundo

    return () => clearInterval(interval);
  }, [currentUser]);


  // ================================
  // Borrar tarea (click = eliminar)
  // ================================
  const deleteTask = async (index: number) => {
    if (!currentUser) return;

    try {
      const res = await fetch("http://localhost:5001/api/tasks/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.id,
          index: index,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Actualizar UI localmente sin refrescar todo
        setTasks(data.tasks);
      } else {
        console.error("Delete failed:", data.message);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };




  // ================================
  // Formatear fecha aesthetic
  // ================================
  const formatDeadline = (dateStr?: string | null) => {
    if (!dateStr) return null;

    // Parsear fecha como UTC y corregir desfase
    const dateRaw = new Date(dateStr);

    // Si la fecha interpretada cae un día antes del string original
    // lo corregimos manualmente sumando 1 día
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(dateRaw);

    if (date.getUTCDate() !== day) {
      // corregir bug de timezone
      date.setDate(date.getDate() + 1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffMs = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 7) {
      const weekday = date.toLocaleDateString("es-MX", { weekday: "long" });
      return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    return date.toLocaleDateString("es-MX");
  };



  // ================================
  // Ordenar tareas por fecha
  // ================================
  const sortedTasks = [...tasks].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : Infinity;
    const timeB = b.date ? new Date(b.date).getTime() : Infinity;
    return timeA - timeB;
  });




  return (
    <div className="bg-[rgba(253,235,216,0.4)] backdrop-blur-md text-white p-4 rounded-2xl shadow-md w-64">
      <h2 className="text-xl text-[#5B3000] font-bold mb-3 text-center">Pendientes</h2>

      {/* Estado de carga */}
      {loading && (
        <p className="text-center text-sm text-[#8F4C00]">Cargando...</p>
      )}

      {/* Usuario no logeado */}
      {!loading && !currentUser && (
        <p className="text-center text-sm text-[#8F4C00]">
          Inicia sesión para ver tus tareas
        </p>
      )}

      {/* Usuario logeado pero sin tareas */}
      {!loading && currentUser && tasks.length === 0 && (
        <p className="text-center text-sm text-[#8F4C00]">
          Nada por hacer 
        </p>
      )}

      
      {/* Lista de tareas */}
      {!loading && currentUser && tasks.length > 0 && (
        <ul className="space-y-2">
          {sortedTasks.map((task, index) => {
            // Índice REAL dentro del arreglo tasks original
            const originalIndex = tasks.indexOf(task);

            return (
              <li
                key={index}
                onClick={() => deleteTask(originalIndex)}
                className="cursor-pointer transition text-[#8F4C00] hover:text-red-300"
              >
                <div className="flex flex-col">
                  {/* Título de la tarea */}
                  <span className="font-medium">{task.title}</span>

                  {/* Fecha límite (solo si existe) */}
                  {task.date && (
                    <span className="text-xs text-[#5B3000] opacity-80 mt-0.5">
                      📅 {formatDeadline(task.date)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}


    </div>
  );
};

export default TodoWidget;