// src/routes/column.ts
import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  createColumn,
  getColumns,
  updateColumn,
  deleteColumn,
  updateColumnOrder,
} from "../controllers/columnController";

const router = Router();

router.use(protect as any);


router.post("/", createColumn as any);
router.get("/board/:boardId", getColumns as any);
router.put("/:columnId", updateColumn as any);
router.delete("/:columnId", deleteColumn as any);
router.put("/board/:boardId/order", updateColumnOrder as any);

export default router;
