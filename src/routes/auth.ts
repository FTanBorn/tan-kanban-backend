// src/routes/auth.ts

import { Router } from "express";
import { register, login, logout } from "../controllers/authController";

const router = Router();

// Yeni kullanıcı kaydı için bir endpoint ekledim
router.post("/register", register as any); // Type assertion kullandım

// Kullanıcı giriş işlemi için bir endpoint ekledim
router.post("/login", login as any); // Type assertion kullandım

// Kullanıcı çıkış işlemi için bir endpoint ekledim
router.post("/logout", logout as any); // Type assertion kullandım

export default router;
