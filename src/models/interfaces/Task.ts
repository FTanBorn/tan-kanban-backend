// src/models/interfaces/Task.ts
import { Types } from "mongoose";

// Görev verilerinin temel yapısını tanımlıyorum
export interface ITaskData {
  title: string; // Görevin başlığı
  description?: string; // Görevin açıklaması (isteğe bağlı)
  assignedTo?: Types.ObjectId; // Görevi atadığım kişi (isteğe bağlı)
  dueDate?: Date; // Son teslim tarihi (isteğe bağlı)
  priority?: "low" | "medium" | "high"; // Öncelik seviyesi (düşük, orta, yüksek)
  status?: string; // Görevin durumu (örn: "todo", "in progress", "done")
  order: number; // Görevin sıralamadaki yeri
  createdAt?: Date; // Oluşturulma tarihi (isteğe bağlı)
  updatedAt?: Date; // Güncellenme tarihi (isteğe bağlı)
}

// MongoDB için Task dokümanını temsil eden arayüzü oluşturuyorum
export interface ITask extends ITaskData {
  _id: Types.ObjectId; // MongoDB tarafından oluşturulan benzersiz ID
}
