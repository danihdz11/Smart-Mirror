import React, { useState } from "react";

const TodoWidget: React.FC = () => {
  const [tasks, setTasks] = useState([
    { text: "Revisar correo", done: false },
    { text: "Estudiar para examen", done: true },
    { text: "Actualizar repositorio", done: false },
  ]);

  const toggleTask = (index: number) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].done = !updatedTasks[index].done;
    setTasks(updatedTasks);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md text-white p-4 rounded-2xl shadow-md w-64">
      <h2 className="text-lg font-semibold mb-3 text-center">📋 Pendientes</h2>
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
            {task.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoWidget;
