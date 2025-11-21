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

  // Obtener usuario actual
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  // ================================
  // Obtener tareas desde backend
  // ================================
  const fetchTasks = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://localhost:5001/api/tasks/${user.id}`
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

  // ================================
  // Borrar tarea (click = eliminar)
  // ================================
  const deleteTask = async (index: number) => {
    if (!user) return;

    try {
      const res = await fetch("http://localhost:5001/api/tasks/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
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

  return (
    <div className="bg-[rgba(253,235,216,0.4)] backdrop-blur-md text-white p-4 rounded-2xl shadow-md w-64">
      <h2 className="text-xl text-[#5B3000] font-bold mb-3 text-center">Pendientes</h2>

      {/* Estado de carga */}
      {loading && (
        <p className="text-center text-sm text-[#8F4C00]">Cargando...</p>
      )}

      {/* Usuario no logeado */}
      {!loading && !user && (
        <p className="text-center text-sm text-[#8F4C00]">
          Inicia sesión para ver tus tareas
        </p>
      )}

      {/* Usuario logeado pero sin tareas */}
      {!loading && user && tasks.length === 0 && (
        <p className="text-center text-sm text-[#8F4C00]">
          Nada por hacer 😄
        </p>
      )}

      {/* Lista de tareas */}
      {!loading && tasks.length > 0 && (
        <ul className="space-y-2">
          {tasks.map((task, index) => (
            // <li
            //   key={index}
            //   onClick={() => deleteTask(index)}
            //   className="cursor-pointer transition  text-[#8F4C00] hover:text-red-300"
            // >
            //   {task.title}
            // </li>
            <li
              key={index}
              onClick={() => deleteTask(index)}
              className="cursor-pointer transition text-[#8F4C00] hover:text-red-300"
            >
              <div className="flex flex-col">
                {/* Título de la tarea */}
                <span className="font-medium">{task.title}</span>

                {/* Fecha límite (solo si existe) */}
                {task.date && (
                  <span className="text-xs text-[#5B3000] opacity-80 mt-0.5">
                    📅 {new Date(task.date).toLocaleDateString("es-MX")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TodoWidget;


// import React, { useEffect, useState } from "react";

// interface Task {
//   title: string;
//   done?: boolean;
// }

// interface TodoWidgetProps {
//   refresh: number;   // 👈 SE AÑADE ESTA PROP
// }


// const TodoWidget: React.FC<TodoWidgetProps> = ({ refresh }) => {
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [user, setUser] = useState<any>(null);

//   // Escuchar cambios en localStorage para resetear cuando se hace logout
//   useEffect(() => {
//     const checkUser = () => {
//       const userFromStorage = localStorage.getItem("user");
//       if (userFromStorage) {
//         try {
//           setUser(JSON.parse(userFromStorage));
//         } catch (e) {
//           setUser(null);
//           setTasks([]);
//         }
//       } else {
//         setUser(null);
//         setTasks([]); // Resetear tareas cuando no hay usuario
//       }
//     };

//     // Handler para logout
//     const handleLogout = () => {
//       setUser(null);
//       setTasks([]);
//     };

//     // Verificar al montar
//     checkUser();

//     // Verificar periódicamente cambios en localStorage
//     const interval = setInterval(checkUser, 500);

//     // Escuchar eventos de storage (por si se modifica desde otra pestaña)
//     window.addEventListener('storage', checkUser);

//     // Escuchar evento personalizado de logout
//     window.addEventListener('userLogout', handleLogout);

//     return () => {
//       clearInterval(interval);
//       window.removeEventListener('storage', checkUser);
//       window.removeEventListener('userLogout', handleLogout);
//     };
//   }, []);

//   useEffect(() => {
//     const fetchTasks = async () => {
//       try {
//         if (!user) {
//           setTasks([]);
//           setLoading(false);
//           return;
//         }

//         const response = await fetch(
//           `http://localhost:5001/api/tasks/${user.id}`
//         );

//         const data = await response.json();

//         if (response.ok) {
//           setTasks(data.tasks || []);
//         } else {
//           console.error("Error fetching tasks:", data.message);
//           setTasks([]);
//         }
//       } catch (error) {
//         console.error("Error:", error);
//         setTasks([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTasks();
//   }, [refresh, user]);

//   const toggleTask = (index: number) => {
//     const updated = [...tasks];
//     updated[index].done = !updated[index].done;
//     setTasks(updated);
//   };

//   return (
//     <div className="bg-white/10 backdrop-blur-md text-white p-4 rounded-2xl shadow-md w-64">
//       <h2 className="text-lg font-semibold mb-3 text-center">📋 Pendientes</h2>

//       {/* 🟡 Si está cargando */}
//       {loading && (
//         <p className="text-center text-gray-300 text-sm">Cargando...</p>
//       )}

//       {/* 🔴 Si no hay usuario */}
//       {!loading && !user && (
//         <p className="text-center text-gray-300 text-sm">
//           Inicia sesión para ver tus tareas
//         </p>
//       )}

//       {/* 🔵 Si está logeado pero no tiene tareas */}
//       {!loading && user && tasks.length === 0 && (
//         <p className="text-center text-gray-300 text-sm">
//           Nada por hacer 😄
//         </p>
//       )}

//       {/* 🟢 Lista de tareas */}
//       {!loading && tasks.length > 0 && (
//         <ul className="space-y-2">
//           {tasks.map((task, index) => (
//             <li
//               key={index}
//               onClick={() => toggleTask(index)}
//               className={`cursor-pointer transition ${
//                 task.done
//                   ? "line-through text-gray-400"
//                   : "hover:text-yellow-200"
//               }`}
//             >
//               {task.title}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// export default TodoWidget;


