// import React, { useEffect, useState } from "react";

// interface Task {
//   title: string;
//   date?: string | null;
//   time?: string | null;
//   repeat?: string;
// }

// interface TodoWidgetProps {
//   refresh: number;
// }

// const TodoWidget: React.FC<TodoWidgetProps> = ({ refresh }) => {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Obtener usuario actual
//   const user = localStorage.getItem("user")
//     ? JSON.parse(localStorage.getItem("user")!)
//     : null;

//   // ================================
//   // Obtener tareas desde backend
//   // ================================
//   const fetchTasks = async () => {
//     try {
//       if (!user) {
//         setLoading(false);
//         return;
//       }

//       const response = await fetch(
//         `http://localhost:5001/api/tasks/${user.id}`
//       );

//       const data = await response.json();

//       if (response.ok) {
//         setTasks(data.tasks || []);
//       } else {
//         console.error("Error fetching tasks:", data.message);
//       }
//     } catch (error) {
//       console.error("Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Cuando refresh cambie → refrescar tareas
//   useEffect(() => {
//     fetchTasks();
//   }, [refresh]);

//   // ================================
//   // Borrar tarea (click = eliminar)
//   // ================================
//   const deleteTask = async (index: number) => {
//     if (!user) return;

//     try {
//       const res = await fetch("http://localhost:5001/api/tasks/delete", {
//         method: "DELETE",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           userId: user.id,
//           index: index,
//         }),
//       });

//       const data = await res.json();

//       if (res.ok) {
//         // Actualizar UI localmente sin refrescar todo
//         setTasks(data.tasks);
//       } else {
//         console.error("Delete failed:", data.message);
//       }
//     } catch (err) {
//       console.error("Delete error:", err);
//     }
//   };


//   return (
//     <div className="bg-[rgba(253,235,216,0.4)] backdrop-blur-md text-white p-4 rounded-2xl shadow-md w-64">
//       <h2 className="text-xl text-[#5B3000] font-bold mb-3 text-center">Pendientes</h2>

//       {/* Estado de carga */}
//       {loading && (
//         <p className="text-center text-sm text-[#8F4C00]">Cargando...</p>
//       )}

//       {/* Usuario no logeado */}
//       {!loading && !user && (
//         <p className="text-center text-sm text-[#8F4C00]">
//           Inicia sesión para ver tus tareas
//         </p>
//       )}

//       {/* Usuario logeado pero sin tareas */}
//       {!loading && user && tasks.length === 0 && (
//         <p className="text-center text-sm text-[#8F4C00]">
//           Nada por hacer 😄
//         </p>
//       )}

//       {/* Lista de tareas */}
//       {!loading && tasks.length > 0 && (
//         <ul className="space-y-2">
//           {tasks.map((task, index) => (
//             // <li
//             //   key={index}
//             //   onClick={() => deleteTask(index)}
//             //   className="cursor-pointer transition  text-[#8F4C00] hover:text-red-300"
//             // >
//             //   {task.title}
//             // </li>
//             <li
//               key={index}
//               onClick={() => deleteTask(index)}
//               className="cursor-pointer transition text-[#8F4C00] hover:text-red-300"
//             >
//               <div className="flex flex-col">
//                 {/* Título de la tarea */}
//                 <span className="font-medium">{task.title}</span>

//                 {/* Fecha límite (solo si existe) */}
//                 {task.date && (
//                   <span className="text-xs text-[#5B3000] opacity-80 mt-0.5">
//                     📅 {new Date(task.date).toLocaleDateString("es-MX")}
//                   </span>
//                 )}
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default TodoWidget;







import React, { useState, useEffect } from "react";

export default function ToDoWidget({ refresh }: any) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Obtener usuario actual del localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Función para formatear la fecha dependiendo qué tan cerca está
  const formatDeadline = (dateStr: string) => {
    if (!dateStr) return null;

    const date = new Date(dateStr);
    const today = new Date();

    // Normalizar (solo fecha)
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffMs = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Si es en los próximos 7 días → día de la semana
    if (diffDays >= 0 && diffDays <= 7) {
      const weekday = date.toLocaleDateString("es-MX", { weekday: "long" });
      return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    // Si es después → formato estándar
    return date.toLocaleDateString("es-MX");
  };

  // Ordenar tareas (por fecha → sin fecha hasta abajo)
  const sortedTasks = [...tasks].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : Infinity;
    const timeB = b.date ? new Date(b.date).getTime() : Infinity;
    return timeA - timeB;
  });

  // Obtener tareas desde backend
  const fetchTasks = async () => {
    try {
      const res = await fetch(`http://localhost:5001/api/tasks/${user.id}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar tarea
  const deleteTask = async (index: number) => {
    try {
      await fetch("http://localhost:5001/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, index }),
      });

      // Remover del estado local
      setTasks((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // Cargar tareas
  useEffect(() => {
    fetchTasks();
  }, [refresh]);

  return (
    <div className="bg-[rgba(253,235,216,0.4)] backdrop-blur-sm rounded-xl p-4 shadow-md w-72">
      <h2 className="text-lg font-semibold text-[#5B3000] mb-2">
        Tareas pendientes
      </h2>

      {loading ? (
        <p className="text-sm text-[#5B3000]/70">Cargando...</p>
      ) : sortedTasks.length === 0 ? (
        <p className="text-sm text-[#5B3000]/70">No hay tareas</p>
      ) : (
        <ul className="space-y-3">
          {sortedTasks.map((task, index) => (
            <li
              key={index}
              onClick={() => deleteTask(index)}
              className="cursor-pointer transition text-[#8F4C00] hover:text-red-300"
            >
              <div className="flex flex-col">
                {/* Título */}
                <span className="font-medium">{task.title}</span>

                {/* Fecha límite (solo si existe) */}
                {task.date && (
                  <span className="text-xs text-[#5B3000] opacity-80 mt-0.5">
                    📅 {formatDeadline(task.date)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


