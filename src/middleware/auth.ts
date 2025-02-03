// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

// JWT içeriğini temsil eden arayüzü oluşturuyorum
interface IPayload {
  id: string; // Kullanıcının ID'sini içeren payload
}

// Express'in Request nesnesine user özelliğini ekliyorum
declare global {
  namespace Express {
    interface Request {
      user?: any; // Kullanıcı bilgisini saklayacağım alan
    }
  }
}

// Kullanıcının kimliğini doğrulayan middleware
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;

  // Header'da token olup olmadığını kontrol ediyorum
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1]; // "Bearer ..." formatından token'ı alıyorum
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IPayload; // Token'ı doğruluyorum
      req.user = await User.findById(decoded.id).select("-password"); // Kullanıcıyı şifresi olmadan alıyorum
      next(); // Bir sonraki middleware'e geçiyorum
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" }); // Token geçersizse hata döndürüyorum
    }
  }

  // Token yoksa yetkisiz erişim hatası veriyorum
  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};
