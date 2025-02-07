// src/controllers/columnController.ts
import { Request, Response } from "express";
import { Column } from "../models/Column";
import Board from "../models/Board";
import { AuthRequest } from "../types/express";

// Board'daki kolonları getirme
export const getColumns = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const hasAccess =
      board.members.includes(req.user._id) ||
      board.owner.toString() === req.user._id.toString();
    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const columns = await Column.find({ board: boardId }).sort("order");
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Kolon oluşturma
export const createColumn = async (req: AuthRequest, res: Response) => {
  try {
    const { name, boardId, type, color, limit } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const hasAccess =
      board.members.includes(req.user._id) ||
      board.owner.toString() === req.user._id.toString();
    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const columnCount = await Column.countDocuments({ board: boardId });
    if (columnCount >= 10) {
      return res.status(400).json({
        message: "Maximum column limit (10) reached",
      });
    }

    const lastColumn = await Column.findOne({ board: boardId }).sort({
      order: -1,
    });
    const order = lastColumn ? lastColumn.order + 1 : 0;

    const column = await Column.create({
      name,
      board: boardId,
      order,
      type: type || "custom",
      color: color || "#E2E8F0",
      limit: limit || null,
    });

    res.status(201).json(column);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Kolon silme
export const deleteColumn = async (req: AuthRequest, res: Response) => {
  try {
    const { columnId } = req.params;

    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    // Board'u kontrol et
    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Yetki kontrolü
    const hasAccess =
      board.members.includes(req.user._id) ||
      board.owner.toString() === req.user._id.toString();
    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Task kontrolü
    if (column.tasks && column.tasks.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete column with tasks. Please move or delete tasks first",
      });
    }

    // Varsayılan kolon kontrolü
    if (column.isDefault) {
      return res.status(400).json({
        message: "Cannot delete default column",
      });
    }

    await column.deleteOne();

    // Kalan kolonların sırasını güncelle
    await Column.updateMany(
      {
        board: column.board,
        order: { $gt: column.order },
      },
      { $inc: { order: -1 } }
    );

    res.json({ message: "Column deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Kolon sırasını güncelleme
export const updateColumnOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const { columnId, newOrder } = req.body;

    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    const oldOrder = column.order;

    // Diğer kolonların sırasını güncelle
    if (newOrder > oldOrder) {
      await Column.updateMany(
        {
          board: boardId,
          order: { $gt: oldOrder, $lte: newOrder },
        },
        { $inc: { order: -1 } }
      );
    } else {
      await Column.updateMany(
        {
          board: boardId,
          order: { $gte: newOrder, $lt: oldOrder },
        },
        { $inc: { order: 1 } }
      );
    }

    column.order = newOrder;
    await column.save();

    res.json({ message: "Column order updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Kolon güncelleme
export const updateColumn = async (req: AuthRequest, res: Response) => {
  try {
    const { columnId } = req.params;
    const { name, type, color, limit } = req.body;

    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    // Yetki kontrolü
    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const hasAccess =
      board.members.includes(req.user._id) ||
      board.owner.toString() === req.user._id.toString();
    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Task limiti kontrolü
    if (limit !== undefined && column.tasks.length > limit) {
      return res.status(400).json({
        message: "Cannot set limit lower than current task count",
      });
    }

    // Güncelleme
    column.name = name || column.name;
    column.type = type || column.type;
    column.color = color || column.color;
    column.limit = limit !== undefined ? limit : column.limit;

    await column.save();

    res.json(column);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
