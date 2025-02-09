// src/routes/board.ts
import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  // Board işlemleri
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  // Kolon işlemleri
  addColumnToBoard,
  updateBoardColumn,
  deleteBoardColumn,
  updateColumnOrder,
  // Üyelik işlemleri
  inviteMember,
  respondToInvitation,
  getMyInvitations,
  leaveBoard,
  removeMember,
} from "../controllers/boardController";

const router = Router();

// Tüm board işlemleri için authentication gerekli
router.use(protect as any);

// Board üyelik işlemleri - En spesifik routelar en üstte
router.get("/invitations/received", getMyInvitations as any);
router.post("/invitations/:invitationId/respond", respondToInvitation as any);

// Board CRUD işlemleri
router
  .route("/")
  .get(getBoards as any)
  .post(createBoard as any);

router
  .route("/:id")
  .get(getBoardById as any)
  .put(updateBoard as any)
  .delete(deleteBoard as any);

// Board üyelik işlemleri
router.post("/:id/invite", inviteMember as any);
router.post("/:boardId/leave", leaveBoard as any);
router.delete("/:boardId/members/:memberId", removeMember as any);

// Kolon işlemleri - Reorder route'u daha spesifik olduğu için önce gelmeli
router.put("/:boardId/columns/reorder", updateColumnOrder as any);

// Kolon CRUD işlemleri
router.post("/:boardId/columns", addColumnToBoard as any);

router
  .route("/:boardId/columns/:columnId")
  .put(updateBoardColumn as any)
  .delete(deleteBoardColumn as any);

export default router;
