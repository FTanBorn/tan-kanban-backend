// src/routes/notification.ts
import { Router } from "express";
import { protect } from "../middleware/auth";
import { AuthRequest } from "../types/express"; // Genişletilmiş AuthRequest tipini ekledim
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  updateNotification,
} from "../controllers/notificationController";

const router = Router();

// Tüm bildirim istekleri için kullanıcı doğrulamasını zorunlu tuttum
router.use(protect as any);

// Kullanıcının tüm bildirimlerini getiriyor
router.get("/", getNotifications as any);

// Kullanıcının okunmamış bildirim sayısını getiriyor
router.get("/unread-count", getUnreadCount as any);

// Belirli bir bildirimi okundu olarak işaretliyor
router.patch("/:notificationId/read", markAsRead as any);

// Tüm bildirimleri okundu olarak işaretliyor
router.patch("/mark-all-read", markAllAsRead as any);

// Belirli bir bildirimi siliyor
router.delete("/:notificationId", deleteNotification as any);

// Belirli bir bildirimi güncelliyor
router.put("/:notificationId", updateNotification as any);

export default router;
