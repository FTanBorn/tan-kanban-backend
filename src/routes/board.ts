import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  addMember,
} from "../controllers/boardController";

const router = Router();

router.use(protect); // Tüm board işlemleri için authentication zorunlu

// Tüm board'ları getiriyorum veya yeni bir tane oluşturuyorum
router
  .route("/")
  .get(getBoards as any) // Tüm board'ları getir
  .post(createBoard as any); // Yeni board oluştur

// Belirli bir board'u getiriyor, güncelliyor veya siliyorum
router
  .route("/:id")
  .get(getBoardById as any) // ID'ye göre board getir
  .put(updateBoard as any) // Board'u güncelle
  .delete(deleteBoard as any); // Board'u sil

// Board'a yeni bir üye ekliyorum
router.post("/:id/members", addMember as any);

export default router;
