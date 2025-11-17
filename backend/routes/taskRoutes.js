import express from "express";
import User from "../models/User.js";

const router = express.Router();

// POST /api/tasks/add
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
