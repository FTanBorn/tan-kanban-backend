// src/controllers/authController.ts
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { Schema } from "mongoose";

// Kullanıcı kayıt isteği için arayüz oluşturuyorum
interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// Kullanıcı giriş isteği için arayüz oluşturuyorum
interface LoginRequest {
  email: string;
  password: string;
}

// JWT token oluşturuyorum
const generateToken = (id: Schema.Types.ObjectId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined"); // Eğer JWT_SECRET tanımlı değilse hata fırlatıyorum
  }
  return jwt.sign({ id: id.toString() }, secret, {
    expiresIn: "30d", // Token 30 gün geçerli olacak
  });
};

// Kullanıcı kayıt işlemi
export const register = async (
  req: Request<{}, {}, RegisterRequest>,
  res: Response
) => {
  try {
    const { name, email, password } = req.body; // Kullanıcıdan gelen verileri alıyorum

    // Kullanıcı zaten var mı kontrol ediyorum
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" }); // Eğer varsa hata dönüyorum
    }

    // Yeni kullanıcı oluşturuyorum
    const user = (await User.create({
      name,
      email,
      password,
    })) as IUser;

    // Başarılı yanıt döndürüyorum
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id), // Kullanıcı için JWT oluşturuyorum
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};

// Kullanıcı giriş işlemi
export const login = async (
  req: Request<{}, {}, LoginRequest>,
  res: Response
) => {
  try {
    const { email, password } = req.body; // Kullanıcıdan gelen email ve şifreyi alıyorum

    // Kullanıcıyı veritabanında arıyorum
    const user = (await User.findOne({ email })) as IUser | null;
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" }); // Kullanıcı bulunamazsa veya şifre yanlışsa hata dönüyorum
    }

    // Başarılı giriş yapıldı, kullanıcı bilgilerini ve token döndürüyorum
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};
