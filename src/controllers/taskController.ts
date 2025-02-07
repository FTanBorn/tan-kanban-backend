// src/controllers/taskController.ts
import { Request, Response } from "express";
import { Schema, Types } from "mongoose";

import Board from "../models/Board";
import { ITask, ITaskData } from "../models/interfaces/Task";
import { Column } from "../models/Column";

// AuthRequest arayüzüne kullanıcı bilgilerini ekliyorum.
interface AuthRequest extends Request {
  user: {
    _id: Schema.Types.ObjectId;
  };
}

// Yeni görev oluşturma isteği için gerekli alanları tanımlıyorum.
interface CreateTaskRequest {
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: Date;
  priority?: "low" | "medium" | "high";
}

// Yeni bir görev oluşturuyorum.
export const createTask = async (
  req: AuthRequest & { body: CreateTaskRequest },
  res: Response
) => {
  try {
    const { columnId } = req.params;
    const { title, description, assignedTo, dueDate, priority } = req.body;

    // Sütunun var olup olmadığını kontrol ediyorum.
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    // Board'un var olup olmadığını kontrol ediyorum.
    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Kullanıcının bu board'a erişimi var mı diye kontrol ediyorum.
    const hasAccess =
      board.members.some((m) => m.toString() === req.user._id.toString()) ||
      board.owner.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Sütundaki en yüksek görev sırasını alıyorum.
    const highestOrder =
      column.tasks.length > 0
        ? Math.max(...column.tasks.map((task) => task.order))
        : -1;

    // Yeni görev için verileri hazırlıyorum.
    const taskData: ITaskData = {
      title,
      description,
      assignedTo: assignedTo ? new Types.ObjectId(assignedTo) : undefined,
      dueDate,
      priority,
      order: highestOrder + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Yeni görevi oluşturuyorum.
    const newTask: ITask = {
      ...taskData,
      _id: new Types.ObjectId(),
    };

    // Görevi sütuna ekliyorum ve kaydediyorum.
    column.tasks.push(newTask);
    await column.save();

    // Oluşturulan görevi yanıt olarak gönderiyorum.
    res.status(201).json(newTask);
  } catch (error) {
    // Hata durumunda sunucu hatası mesajı gönderiyorum.
    res.status(500).json({ message: "Server error", error });
  }
};

// Bir görevi güncelliyorum.
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { columnId, taskId } = req.params;
    const updates = req.body;

    // Sütunun var olup olmadığını kontrol ediyorum.
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    // Görevin sütun içindeki indeksini buluyorum.
    const taskIndex = column.tasks.findIndex(
      (task) => task._id.toString() === taskId
    );
    if (taskIndex === -1) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Board'un var olup olmadığını kontrol ediyorum.
    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Kullanıcının bu board'a erişimi var mı diye kontrol ediyorum.
    const hasAccess =
      board.members.some((m) => m.toString() === req.user._id.toString()) ||
      board.owner.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Görevi güncelliyorum ve güncellenme tarihini ayarlıyorum.
    Object.assign(column.tasks[taskIndex], {
      ...updates,
      updatedAt: new Date(),
    });

    // Sütunu kaydediyorum ve güncellenmiş görevi yanıt olarak gönderiyorum.
    await column.save();
    res.json(column.tasks[taskIndex]);
  } catch (error) {
    // Hata durumunda sunucu hatası mesajı gönderiyorum.
    res.status(500).json({ message: "Server error", error });
  }
};

// Bir görevi siliyorum.
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { columnId, taskId } = req.params;

    // Sütunun var olup olmadığını kontrol ediyorum.
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    // Board'un var olup olmadığını kontrol ediyorum.
    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Kullanıcının bu board'a erişimi var mı diye kontrol ediyorum.
    const hasAccess =
      board.members.some((m) => m.toString() === req.user._id.toString()) ||
      board.owner.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Görevi sütundan kaldırıyorum ve kaydediyorum.
    column.tasks = column.tasks.filter(
      (task) => task._id.toString() !== taskId
    );
    await column.save();

    // Başarı mesajı gönderiyorum.
    res.json({ message: "Task removed" });
  } catch (error) {
    // Hata durumunda sunucu hatası mesajı gönderiyorum.
    res.status(500).json({ message: "Server error", error });
  }
};

// Bir görevi başka bir sütuna taşıyorum.
export const moveTask = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { sourceColumnId, destinationColumnId, newOrder } = req.body;

    // Kaynak sütunu buluyorum.
    const sourceColumn = await Column.findById(sourceColumnId);
    if (!sourceColumn) {
      return res.status(404).json({ message: "Source column not found" });
    }

    // Hedef sütunu buluyorum.
    const destinationColumn = await Column.findById(destinationColumnId);
    if (!destinationColumn) {
      return res.status(404).json({ message: "Destination column not found" });
    }

    // Board'un var olup olmadığını kontrol ediyorum.
    const board = await Board.findById(sourceColumn.board);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Kullanıcının bu board'a erişimi var mı diye kontrol ediyorum.
    const hasAccess =
      board.members.some((m) => m.toString() === req.user._id.toString()) ||
      board.owner.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Görevi kaynak sütundan bulup kaldırıyorum.
    const taskIndex = sourceColumn.tasks.findIndex(
      (task) => task._id && task._id.toString() === taskId
    );
    if (taskIndex === -1) {
      return res.status(404).json({ message: "Task not found" });
    }

    const [task] = sourceColumn.tasks.splice(taskIndex, 1);
    task.order = newOrder;

    // Görevi hedef sütuna ekliyorum ve sıralıyorum.
    destinationColumn.tasks.push(task);
    destinationColumn.tasks.sort((a, b) => a.order - b.order);

    // Her iki sütunu da kaydediyorum.
    await Promise.all([sourceColumn.save(), destinationColumn.save()]);

    // Başarı mesajı gönderiyorum.
    res.json({ message: "Task moved successfully" });
  } catch (error) {
    // Hata durumunda sunucu hatası mesajı gönderiyorum.
    res.status(500).json({ message: "Server error", error });
  }
};
