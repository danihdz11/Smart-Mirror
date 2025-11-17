import { useState } from "react";

export default function AddTaskWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleAddTask = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user) {
        alert("Debes iniciar sesión para agregar tareas.");
        return;
      }

      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:5001/api/tasks/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
        userId: user.id,
        title
        })
        // body: JSON.stringify({
        //   userId: user.id,
        //   title,
        //   date: new Date(),
        //   time: "00:00",
        //   repeat: "none"
        // })
      });

      const result = await response.json();

      if (response.ok) {
        alert("Tarea agregada ✔");
        setTitle("");
        setIsOpen(false);
      } else {
        alert("Error: " + result.message);
      }

    } catch (err) {
      console.error(err);
      alert("Hubo un error al guardar la tarea.");
    }
  };

  return (
    <div className="absolute bottom-6 right-6 pointer-events-auto">
      
      {/* Botón + */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white text-lg rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-blue-700 transition"
      >
        +
      </button>

      {/* Mini formulario */}
      {isOpen && (
        <div className="mt-3 bg-white p-4 shadow-xl rounded-xl w-64">
          <h3 className="text-sm font-semibold mb-2">Add task</h3>

          <input
            className="w-full border px-2 py-1 rounded-lg mb-3"
            placeholder="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <button
            onClick={handleAddTask}
            className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition w-full"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
