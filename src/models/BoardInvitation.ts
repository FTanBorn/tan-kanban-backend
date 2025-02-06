// src/models/BoardInvitation.ts
import mongoose, { Document, Schema } from "mongoose";

// Tahta daveti için TypeScript arayüzü oluşturuyorum
export interface IBoardInvitation extends Document {
  board: Schema.Types.ObjectId; // Davetin ait olduğu tahta
  invitedBy: Schema.Types.ObjectId; // Daveti gönderen kullanıcı
  invitedUser: Schema.Types.ObjectId; // Davet edilen kullanıcı
  isAccepted: boolean; // Davetin kabul edilip edilmediği
  expiresAt: Date; // Davetin ne zaman sona ereceği
  createdAt: Date; // Oluşturulma tarihi (timestamps sayesinde otomatik atanıyor)
  updatedAt: Date; // Güncellenme tarihi (timestamps sayesinde otomatik atanıyor)
}

// Tahta daveti şeması
const boardInvitationSchema = new Schema(
  {
    board: {
      type: Schema.Types.ObjectId,
      ref: "Board", // Tahtaya referans veriyorum
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // Daveti gönderen kullanıcıya referans
      required: true,
    },
    invitedUser: {
      type: Schema.Types.ObjectId,
      ref: "User", // Davet edilen kullanıcıya referans
      required: true,
    },
    isAccepted: {
      type: Boolean,
      default: false, // Varsayılan olarak davet kabul edilmemiş olacak
    },
    expiresAt: {
      type: Date,
      required: true, // Davetin bir son kullanma tarihi olması gerekiyor
    },
  },
  {
    timestamps: true, // createdAt ve updatedAt otomatik olarak eklenecek
    collection: "boardinvitations", // Koleksiyon ismini açıkça belirttim
  }
);

// Modeli oluşturup dışa aktarıyorum
export default mongoose.model<IBoardInvitation>(
  "BoardInvitation",
  boardInvitationSchema
);
