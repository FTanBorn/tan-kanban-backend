// src/controllers/columnController.ts
import { Request, Response } from "express";
import { Schema } from "mongoose";
import Column from "../models/Column";
import Board from "../models/Board";

// AuthRequest arayüzüne kullanıcı bilgilerini ekliyorum.
interface AuthRequest extends Request {
  user: {
    _id: Schema.Types.ObjectId;
  };
}

// Yeni sütun oluşturma isteği için gerekli alanları tanımlıyorum.
interface CreateColumnRequest {
  name: string;
  boardId: string;
}

// Sütun güncelleme isteği için gerekli alanları tanımlıyorum.
interface UpdateColumnRequest {
  name?: string;
  order?: number;
}

// Yeni bir sütun oluşturuyorum.
export const createColumn = async (
  req: AuthRequest & { body: CreateColumnRequest },
  res: Response
) => {
  try {
    const { name, boardId } = req.body;

    // Board'un var olup olmadığını ve kullanıcının erişimine açık olup olmadığını kontrol ediyorum.
    const board = await Board.findById(boardId);
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

    // En yüksek sıra numarasını alıyorum.
    const lastColumn = await Column.findOne({ board: boardId }).sort("-order");
    const order = lastColumn ? lastColumn.order + 1 : 0;

    // Yeni sütunu oluşturuyorum.
    const column = await Column.create({
      name,
      board: boardId,
      order,
      tasks: [],
    });

    // Oluşturulan sütunu yanıt olarak gönderiyorum.
    res.status(201).json(column);
  } catch (error) {
    // Hata durumunda sunucu hatası mesajı gönderiyorum.
    res.status(500).json({ message: "Server error", error });
  }
};

// Board'a ait sütunları getiriyorum.
export const getColumns = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;

    // Board'un var olup olmadığını ve kullanıcının erişimine açık olup olmadığını kontrol ediyorum.
    const board = await Board.findById(boardId);
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

    // Board'a ait sütunları sıralı bir şekilde getiriyorum.
    const columns = await Column.find({ board: boardId }).sort("order");
    res.json(columns);
  } catch (error) {
    // Hata durumunda sunucu hatası mesajı gönderiyorum.
    res.status(500).json({ message: "Server error", error });
  }
};

// Bir sütunu güncelliyorum.
export const updateColumn = async (
  req: AuthRequest & { body: UpdateColumnRequest },
  res: Response
) => {
  try {
    const { name, order } = req.body;
    const column = await Column.findById(req.params.id);

    // Sütunun var olup olmadığını kontrol ediyorum.
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

    // Sütunun adını ve sırasını güncelliyorum.
    if (name) column.name = name;
    if (typeof order === "number") column.order = order;

    // Güncellenmiş sütunu kaydediyorum ve yanıt olarak gönderiyorum.
    const updatedColumn = await column.save();
    res.json(updatedColumn);
  } catch (error) {
    // Hata durumunda sunucu hatası mesajı gönderiyorum.
    res.status(500).json({ message: "Server error", error });
  }
};

// Bir sütunu siliyorum.
export const deleteColumn = async (req: AuthRequest, res: Response) => {
  try {
    const column = await Column.findById(req.params.id);

    // Sütunun var olup olmadığını kontrol ediyorum.
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

    // Sütunu siliyorum ve başarı mesajı gönderiyorum.
    await column.deleteOne();
    res.json({ message: "Column removed" });
  } catch (error) {
    // Hata durumunda sunucu hatası mesajı gönderiyorum.
    res.status(500).json({ message: "Server error", error });
  }
};
