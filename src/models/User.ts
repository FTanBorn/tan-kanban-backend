// src/models/User.ts
import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

// Kullanıcı modelinin TypeScript arayüzünü tanımlıyorum
export interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Kullanıcı şemasını oluşturuyorum
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // İsim alanı zorunlu
    },
    email: {
      type: String,
      required: true, // E-posta alanı zorunlu
      unique: true, // Aynı e-posta iki kez kullanılamaz
    },
    password: {
      type: String,
      required: true, // Şifre alanı zorunlu
    },
  },
  { timestamps: true } // Kullanıcı oluşturulma ve güncellenme zamanlarını otomatik ekliyorum
);

// Kullanıcı kaydedilmeden önce şifreyi hash'liyorum
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Şifre değişmediyse işlemi atlıyorum

  const salt = await bcrypt.genSalt(10); // Salt oluşturuyorum
  this.password = await bcrypt.hash(this.password, salt); // Şifreyi hash'liyorum
});

// Kullanıcının girdiği şifreyi, hash'lenmiş şifreyle karşılaştırıyorum
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Modeli dışa aktarıyorum
export default mongoose.model<IUser>("User", userSchema);
