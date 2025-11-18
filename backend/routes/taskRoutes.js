import express from "express";
import User from "../models/User.js";
import { taskSchema } from "../models/userValidation.js";

const router = express.Router();

/* ===========================
   GET: Obtener tareas del usuario
   =========================== */
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ tasks: user.tasks });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// // POST /api/tasks/add
router.post("/add", async (req, res) => {
  try {
    const { userId, title, date, time, repeat } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.tasks.push({ title, date, time, repeat });
    await user.save();

    res.status(200).json({ message: "Task added", tasks: user.tasks });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;


/* ===========================
   POST: Agregar tarea
   =========================== */
// router.post("/add", async (req, res) => {
//   try {
//     const { userId, title, date, time, repeat } = req.body;

//     // Validación con Joi ESTO LO TENGO QUE CHECAR PORQUE ME MARCABA ERROR
//     const { error } = taskSchema.validate({
//       title,
//       date,
//       time,
//       repeat,
//     });

//     if (error) {
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     // Buscar usuario
//     const user = await User.findById(userId);
//     if (!user)
//       return res.status(404).json({ message: "User not found" });

//     // Crear tarea
//     const newTask = { title, date, time, repeat };
//     user.tasks.push(newTask);

//     await user.save();

//     res.status(201).json({
//       message: "Task added successfully",
//       tasks: user.tasks,
//     });
//   } catch (err) {
//     console.error("Error adding task:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


