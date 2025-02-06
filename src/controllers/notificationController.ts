// src/controllers/notificationController.ts
import { Request, Response } from "express";
import { Types } from "mongoose";
import Notification from "../models/Notification";
import { AuthRequest } from "../types/express";

interface GetNotificationsQuery {
  page?: string;
  limit?: string;
  type?: string;
  isRead?: string;
}

// Bildirimleri getir (paginated)
export const getNotifications = async (
  req: AuthRequest & { query: GetNotificationsQuery },
  res: Response
) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const skip = (page - 1) * limit;

    // Filtreleme seçenekleri
    const filter: any = { recipient: req.user._id };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isRead) filter.isRead = req.query.isRead === "true";

    // Bildirimleri getir
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name email")
      .populate("board", "name");

    // Toplam bildirim sayısı
    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Okunmamış bildirim sayısı
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Bildirimi okundu olarak işaretle
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        recipient: req.user._id,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Bildirimi güncelle
export const updateNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { metadata } = req.body;

    // Metadata alanının boş olup olmadığını kontrol et
    if (metadata === undefined || typeof metadata !== "object") {
      return res.status(400).json({ message: "Geçersiz metadata değeri" });
    }

    // Güncelleme işlemi
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.notificationId,
        recipient: req.user._id, // Sadece bildirimin sahibi güncelleme yapabilir
      },
      { metadata }, // Sadece metadata alanını güncelle
      { new: true, runValidators: true } // Güncellenmiş dokümanı döndür ve validasyonları çalıştır
    );

    // Bildirim bulunamazsa hata döndür
    if (!notification) {
      return res.status(404).json({ message: "Bildirim bulunamadı" });
    }

    // Güncellenmiş bildirimi döndür
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası", error });
  }
};

// Tüm bildirimleri okundu olarak işaretle
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Bildirimi sil
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
