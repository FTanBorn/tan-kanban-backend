// src/config/db.ts
import mongoose from "mongoose";
import dotenv from "dotenv";

// .env dosyasındaki ortam değişkenlerini yüklüyorum.
dotenv.config();

// MongoDB'ye bağlanmak için bir fonksiyon tanımlıyorum.
const connectDB = async () => {
  try {
    // MongoDB URI'sini kullanarak bağlantı kuruyorum.
    const conn = await mongoose.connect(process.env.MONGODB_URI!);

    // Başarılı bağlantı mesajını konsola yazdırıyorum.
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // Hata durumunda hatayı konsola yazdırıyorum ve uygulamayı sonlandırıyorum.
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// connectDB fonksiyonunu dışa aktarıyorum.
export default connectDB;
