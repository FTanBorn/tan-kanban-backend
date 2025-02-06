import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  createColumn,
  getColumns,
  updateColumn,
  deleteColumn,
} from "../controllers/columnController";

const router = Router();

router.use(protect as any); // Tüm column işlemleri için authentication zorunlu

// Yeni bir column oluşturuyorum
router.route("/").post(createColumn as any);

// Belirli bir board'un tüm column'larını getiriyorum
router.route("/board/:boardId").get(getColumns as any);

// Belirli bir column'u güncelliyor veya siliyorum
router
  .route("/:id")
  .put(updateColumn as any) // Column'u güncelle
  .delete(deleteColumn as any); // Column'u sil

export default router;
