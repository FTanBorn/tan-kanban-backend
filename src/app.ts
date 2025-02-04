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

const corsOptions = {
  origin: [
    "http://localhost:3000", // Local development
    "https://tan-kanban-board.vercel.app", // Production
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true, // Cookie ve Authorization header'ları için gerekli
  maxAge: 86400, // CORS önbellek süresi - 24 saat
};

// Middleware'leri ekliyorum
app.use(cors(corsOptions)); // CORS'u aktif ediyorum

// Headers için middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin); // Dinamik origin
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

// API route'larını tanımlıyorum
app.use("/api/auth", authRoutes); // Authentication route'larını ekliyorum
app.use("/api/boards", boardRoutes); // Board işlemleri için route'ları ekliyorum
app.use("/api/columns", columnRoutes); // Column işlemleri için route'ları ekliyorum

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

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
