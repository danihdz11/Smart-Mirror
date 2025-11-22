import express from "express";
import User from "../models/User.js";

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

/* ===========================
   POST: Agregar tarea
   =========================== */
router.post("/add", async (req, res) => {
  try {
    const { userId, title, date, time, repeat } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.tasks.push({ title, date, time, repeat });
    await user.save();

    res.status(200).json({ message: "Task added", tasks: user.tasks });

  } catch (err) {
    console.error("Add error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===========================
   DELETE: Eliminar tarea
   =========================== */
router.delete("/delete", async (req, res) => {
  try {
    const { userId, index } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (index < 0 || index >= user.tasks.length) {
      return res.status(400).json({ message: "Invalid task index" });
    }

    // quitar la tarea del array
    user.tasks.splice(index, 1);
    await user.save();

    res.json({
      message: "Task deleted",
      tasks: user.tasks,
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;







