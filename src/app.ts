// src/app.ts
import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";

// Gerekli route'ları içe aktarıyorum
import authRoutes from "./routes/auth";
import boardRoutes from "./routes/board";
import notificationRoutes from "./routes/notification";

dotenv.config();

const app: Express = express();

// Middleware'leri ekliyorum
app.use(cors()); // CORS'u aktif ediyorum
app.use(express.json()); // JSON verilerini işleyebilmek için middleware ekliyorum

// API route'larını tanımlıyorum
app.use("/api/auth", authRoutes); // Authentication route'larını ekliyorum
app.use("/api/boards", boardRoutes); // Board işlemleri için route'ları ekliyorum
app.use("/api/notifications", notificationRoutes);

// Veritabanına bağlanıyorum
connectDB();

// Sunucuyu başlatıyorum
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
