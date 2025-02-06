// src/routes/board.ts

import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  inviteMember,
  respondToInvitation,
  getMyInvitations,
  leaveBoard,
  removeMember,
} from "../controllers/boardController";

const router = Router();

router.use(protect as any); // Tüm board işlemleri için authentication zorunlu

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

// Davet sistemi rotaları
router.get("/invitations/received", getMyInvitations as any);
router.post("/:id/invite", inviteMember as any);
router.post("/invitations/:invitationId/respond", respondToInvitation as any);

// Board'dan ayrılma ve üye yönetimi rotaları
router.post("/:boardId/leave", leaveBoard as any);
router.delete("/:boardId/members/:memberId", removeMember as any); // Yeni eklenen endpoint

export default router;
