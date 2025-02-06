// src/models/Board.ts
import mongoose, { Document, Schema } from "mongoose";
import { Types } from "mongoose";

// Tahta modeli için TypeScript arayüzü oluşturuyorum
export interface IBoard extends Document {
  name: string; // Tahtanın adı
  description?: string; // Opsiyonel açıklama alanı
  owner: Types.ObjectId; // Tahtanın sahibi (Bir kullanıcı ID'si)
  members: Types.ObjectId[]; // Tahtadaki üyeler (Birden fazla kullanıcı ID'si)
}

// MongoDB şemasını tanımlıyorum
const boardSchema = new Schema(
  {
    name: {
      type: String,
      required: true, // Tahtanın ismi zorunlu
    },
    description: {
      type: String, // Açıklama opsiyonel
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User", // Kullanıcıya referans veriyorum
      required: true, // Tahtanın bir sahibi olması zorunlu
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // Üyeler kullanıcı koleksiyonundan olacak
      },
    ],
  },
  { timestamps: true } // createdAt ve updatedAt otomatik olarak eklenecek
);

// Modeli oluşturup dışa aktarıyorum
export default mongoose.model<IBoard>("Board", boardSchema);
