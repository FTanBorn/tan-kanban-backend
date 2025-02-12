// src/models/Notification.ts
import mongoose, { Document, Schema } from "mongoose";

// Bildirim türlerini belirledim, böylece kodun her yerinde sabit string kullanmak yerine enum kullanabiliyorum
export enum NotificationType {
  BOARD_INVITATION = "BOARD_INVITATION", // Kullanıcıya bir tahta daveti gönderildiğinde
  BOARD_DELETED = "BOARD_DELETED", // Tahta silindiğinde bildirim gönderilir
  MEMBER_ADDED = "MEMBER_ADDED", // Yeni bir üye tahta eklediğinde
  MEMBER_LEFT = "MEMBER_LEFT", // Üye tahtadan ayrıldığında
  MEMBER_REMOVED = "MEMBER_REMOVED", // Üye yönetici tarafından kaldırıldığında
  BOARD_UPDATED = "BOARD_UPDATED", // Tahta güncellendiğinde bildirim gönderilir
  ASSIGNED = "ASSIGNED",
  TASK_COMPLETED = "TASK_COMPLETED",
  MENTIONED = "MENTIONED",
}

// Bildirim önceliklerini belirledim, böylece bazı bildirimlerin daha önemli olduğunu belirtebilirim
export enum NotificationPriority {
  HIGH = "HIGH", // Önemli bildirimler (örneğin, tahta silinmesi)
  MEDIUM = "MEDIUM", // Orta seviye bildirimler
  LOW = "LOW", // Daha az önemli bildirimler
}

// Bildirimler için TypeScript arayüzü tanımladım
export interface INotification extends Document {
  recipient: Schema.Types.ObjectId; // Bildirimi alacak kullanıcı
  sender: Schema.Types.ObjectId; // Bildirimi gönderen kullanıcı
  board: Schema.Types.ObjectId; // Bildirimin ait olduğu tahta
  type: NotificationType; // Bildirimin türü
  priority: NotificationPriority; // Bildirimin önceliği
  message: string; // Bildirim mesajı
  isRead: boolean; // Okunup okunmadığını belirtiyor
  metadata?: Record<string, any>; // Ekstra verileri saklamak için opsiyonel bir alan
  createdAt: Date; // Bildirimin oluşturulma tarihi
  readAt?: Date; // Bildirimin ne zaman okunduğu (opsiyonel)
}

// Bildirim şeması
const notificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "User", // Kullanıcıya referans veriyorum
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User", // Kullanıcıya referans veriyorum
    required: true,
  },
  board: {
    type: Schema.Types.ObjectId,
    ref: "Board", // Tahtaya referans veriyorum
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(NotificationType), // Sadece belirlenen türlerde olmasını sağlıyorum
    required: true,
  },
  priority: {
    type: String,
    enum: Object.values(NotificationPriority), // Bildirimin öncelik seviyesini belirliyorum
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false, // Varsayılan olarak okunmamış olacak
  },
  metadata: {
    type: Schema.Types.Mixed, // Her türlü veri saklanabilir
    default: {}, // Varsayılan olarak boş bir obje
  },
  createdAt: {
    type: Date,
    default: Date.now, // Bildirim oluşturulurken tarih atanacak
  },
  readAt: {
    type: Date, // Bildirimin ne zaman okunduğunu saklamak için
  },
});

// Bildirim modelini oluşturup dışa aktarıyorum
export default mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
