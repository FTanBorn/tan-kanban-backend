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
  getSimpleBoards,
} from "../controllers/boardController";

import {
  // Task işlemleri
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
  // Yorum işlemleri
  addComment,
  updateComment,
  deleteComment,
  // Atama işlemleri
  assignUser,
  unassignUser,
} from "../controllers/taskController";

const router = Router();

// Tüm board işlemleri için authentication gerekli
router.use(protect as any);

// Board üyelik işlemleri
router.get("/invitations/received", getMyInvitations as any);
router.post("/invitations/:invitationId/respond", respondToInvitation as any);

// Board CRUD işlemleri
router
  .route("/")
  .get(getBoards as any)
  .post(createBoard as any);

router.get("/simple", getSimpleBoards as any);

router
  .route("/:id")
  .get(getBoardById as any)
  .put(updateBoard as any)
  .delete(deleteBoard as any);

// Board üyelik işlemleri
router.post("/:id/invite", inviteMember as any);
router.post("/:boardId/leave", leaveBoard as any);
router.delete("/:boardId/members/:memberId", removeMember as any);

// Kolon işlemleri
router.put("/:boardId/columns/reorder", updateColumnOrder as any);
router.post("/:boardId/columns", addColumnToBoard as any);
router
  .route("/:boardId/columns/:columnId")
  .put(updateBoardColumn as any)
  .delete(deleteBoardColumn as any);

// Task CRUD işlemleri
router
  .route("/:boardId/columns/:columnId/tasks")
  .get(getTasks as any) // Kolondaki tüm taskları getir
  .post(createTask as any); // Yeni task oluştur

router
  .route("/:boardId/tasks/:taskId")
  .get(getTaskById as any) // Tekil task getir
  .put(updateTask as any) // Task güncelle
  .delete(deleteTask as any); // Task sil

// Task taşıma işlemi
router.put("/:boardId/tasks/:taskId/move", moveTask as any);

// Task yorum işlemleri
router.post("/:boardId/tasks/:taskId/comments", addComment as any);
router
  .route("/:boardId/tasks/:taskId/comments/:commentId")
  .put(updateComment as any)
  .delete(deleteComment as any);

// Task atama işlemleri
router.post("/:boardId/tasks/:taskId/assign/:userId", assignUser as any);
router.delete("/:boardId/tasks/:taskId/assign/:userId", unassignUser as any);

export default router;
