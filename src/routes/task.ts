// src/routes/task.ts
import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  createTask,
  updateTask,
  deleteTask,
  moveTask,
} from "../controllers/taskController";

const router = Router();

router.use(protect as any); // Tüm task işlemleri için authentication zorunlu

// Yeni bir task oluşturuyorum
router.post("/column/:columnId/tasks", createTask as any);

// Belirli bir task'ı güncelliyorum
router.put("/column/:columnId/tasks/:taskId", updateTask as any);

// Belirli bir task'ı siliyorum
router.delete("/column/:columnId/tasks/:taskId", deleteTask as any);

// Task'ı başka bir yere taşıyorum
router.post("/tasks/:taskId/move", moveTask as any);

export default router;
