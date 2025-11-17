import React, { useEffect, useState } from "react";

interface Task {
  title: string;
  done?: boolean;
}

interface TodoWidgetProps {
  refresh: number;   // 👈 SE AÑADE ESTA PROP
}


const TodoWidget: React.FC<TodoWidgetProps> = ({ refresh }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Leer usuario actual desde localStorage
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  useEffect(() => {
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

    fetchTasks();
  }, [refresh]);

  const toggleTask = (index: number) => {
    const updated = [...tasks];
    updated[index].done = !updated[index].done;
    setTasks(updated);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md text-white p-4 rounded-2xl shadow-md w-64">
      <h2 className="text-lg font-semibold mb-3 text-center">📋 Pendientes</h2>

      {/* 🟡 Si está cargando */}
      {loading && (
        <p className="text-center text-gray-300 text-sm">Cargando...</p>
      )}

      {/* 🔴 Si no hay usuario */}
      {!loading && !user && (
        <p className="text-center text-gray-300 text-sm">
          Inicia sesión para ver tus tareas
        </p>
      )}

      {/* 🔵 Si está logeado pero no tiene tareas */}
      {!loading && user && tasks.length === 0 && (
        <p className="text-center text-gray-300 text-sm">
          Nada por hacer 😄
        </p>
      )}

      {/* 🟢 Lista de tareas */}
      {!loading && tasks.length > 0 && (
        <ul className="space-y-2">
          {tasks.map((task, index) => (
            <li
              key={index}
              onClick={() => toggleTask(index)}
              className={`cursor-pointer transition ${
                task.done
                  ? "line-through text-gray-400"
                  : "hover:text-yellow-200"
              }`}
            >
              {task.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TodoWidget;





// import React, { useState } from "react";

// const TodoWidget: React.FC = () => {
//   const [tasks, setTasks] = useState([
//     { text: "Revisar correo", done: false },
//     { text: "Estudiar para examen", done: true },
//     { text: "Actualizar repositorio", done: false },
//   ]);

//   const toggleTask = (index: number) => {
//     const updatedTasks = [...tasks];
//     updatedTasks[index].done = !updatedTasks[index].done;
//     setTasks(updatedTasks);
//   };

//   return (
//     <div className="bg-white/10 backdrop-blur-md text-white p-4 rounded-2xl shadow-md w-64">
//       <h2 className="text-lg font-semibold mb-3 text-center">📋 Pendientes</h2>
//       <ul className="space-y-2">
//         {tasks.map((task, index) => (
//           <li
//             key={index}
//             onClick={() => toggleTask(index)}
//             className={`cursor-pointer transition ${
//               task.done
//                 ? "line-through text-gray-400"
//                 : "hover:text-yellow-200"
//             }`}
//           >
//             {task.text}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default TodoWidget;
