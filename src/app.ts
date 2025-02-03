// src/app.ts
import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";

// Gerekli route'ları içe aktarıyorum
import authRoutes from "./routes/auth";
import boardRoutes from "./routes/board";
import columnRoutes from "./routes/column";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

// Middleware'leri ekliyorum
app.use(cors()); // CORS'u aktif ediyorum
app.use(express.json()); // JSON verilerini işleyebilmek için middleware ekliyorum

// API route'larını tanımlıyorum
app.use("/api/auth", authRoutes); // Authentication route'larını ekliyorum
app.use("/api/boards", boardRoutes); // Board işlemleri için route'ları ekliyorum
app.use("/api/columns", columnRoutes); // Column işlemleri için route'ları ekliyorum

// Veritabanına bağlanıyorum
connectDB();

// Sunucuyu başlatıyorum
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
