// src/types/express.d.ts
import { Request } from "express";
import { Types } from "mongoose";

// Request nesnesini genişleterek kullanıcı bilgilerini ekledim
export interface AuthRequest extends Request {
  user: {
    _id: Types.ObjectId; // Kullanıcının MongoDB ObjectId'si
    name: string; // Kullanıcının adı
    email: string; // Kullanıcının e-posta adresi
  };
}
