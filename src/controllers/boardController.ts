// src/controllers/boardController.ts
import { Request, Response } from "express";
import { Types, Document } from "mongoose";
import Board, { ColumnType, IBoard, IColumnData } from "../models/Board";
import User from "../models/User";
import BoardInvitation from "../models/BoardInvitation";
import { NotificationType, NotificationPriority } from "../models/Notification";
import Notification from "../models/Notification";

// Request interfaces
interface CreateBoardRequest {
  name: string;
  description?: string;
}

interface UpdateBoardRequest {
  name?: string;
  description?: string;
}

interface AddColumnRequest {
  name: string;
  type?: ColumnType;
  color?: string;
  limit?: number;
}

interface UpdateColumnRequest {
  name?: string;
  type?: ColumnType;
  color?: string;
  limit?: number;
}

interface UpdateColumnOrderRequest {
  columnId: string;
  newOrder: number;
}

// Tür (Type) Tanımlamaları
interface AuthRequest extends Request {
  user: {
    _id: Types.ObjectId;
  };
}

interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

interface BoardDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  members: Types.ObjectId[];
}

interface UserInfo {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

interface CreateBoardRequest {
  name: string;
  description?: string;
}

// Board güncelleme için veri tipi
interface UpdateBoardRequest {
  name?: string;
  description?: string;
}

// Board üyeleri eklemek için veri tipi
interface AddMemberRequest {
  email: string;
}

// Yardımcı Fonksiyonlar
const handleServerError = (res: Response, error: unknown) => {
  console.error("Server error:", error);
  res.status(500).json({
    message: "Server error",
    error: process.env.NODE_ENV === "development" ? error : undefined,
  });
};

const checkBoardAccess = async (
  boardId: string,
  userId: Types.ObjectId,
  requireOwner: boolean = false
): Promise<IBoard> => {
  const board = await Board.findById(boardId);
  if (!board) {
    throw new Error("Board not found");
  }

  const isOwner = board.owner.toString() === userId.toString();
  const isMember = board.members.some(
    (m) => m.toString() === userId.toString()
  );

  if (requireOwner && !isOwner) {
    throw new Error("Only board owner can perform this action");
  }

  if (!isOwner && !isMember) {
    throw new Error("Not authorized");
  }

  return board;
};

const createNotification = async (params: {
  recipientId: Types.ObjectId;
  senderId: Types.ObjectId;
  boardId: Types.ObjectId;
  type: NotificationType;
  message: string;
  metadata?: Record<string, any>;
}) => {
  return Notification.create({
    recipient: params.recipientId,
    sender: params.senderId,
    board: params.boardId,
    type: params.type,
    priority: NotificationPriority.MEDIUM,
    message: params.message,
    metadata: params.metadata || {},
  });
};

const checkBoardOwnership = async (userId: string, boardId: string) => {
  const board = await Board.findById(boardId);
  if (!board) throw new Error("Board not found");
  if (board.owner.toString() !== userId) throw new Error("Not authorized");
  return board;
};

// Board Oluşturma
export const createBoard = async (
  req: AuthRequest & { body: CreateBoardRequest },
  res: Response
) => {
  try {
    const { name, description } = req.body;

    const board = await Board.create({
      name,
      description,
      owner: req.user._id,
      members: [req.user._id],
    });

    const populatedBoard = await Board.findById(board._id)
      .populate("owner", "name email")
      .exec();

    res.status(201).json(populatedBoard);
  } catch (error) {
    handleServerError(res, error);
  }
};

// Board'ları getir
export const getBoards = async (req: AuthRequest, res: Response) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    }).populate("owner", "name email");

    res.json(boards);
  } catch (error) {
    handleServerError(res, error);
  }
};

export const getSimpleBoards = async (req: AuthRequest, res: Response) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .populate("owner", "name description email")
      .select("name description owner");

    const simplifiedBoards = boards.map((board: any) => ({
      _id: board._id,
      name: board.name,
      description: board.description,
      owner: {
        _id: board.owner._id,
        name: board.owner.name,
        email: board.owner.email,
      },
    }));

    res.json(simplifiedBoards);
  } catch (error) {
    handleServerError(res, error);
  }
};

// Board Bilgisi Getirme
export const getBoardById = async (req: AuthRequest, res: Response) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const isOwnerOrMember =
      (board.owner as any)._id.toString() === req.user._id.toString() ||
      board.members.some(
        (member) => (member as any)._id.toString() === req.user._id.toString()
      );

    if (!isOwnerOrMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(board);
  } catch (error) {
    handleServerError(res, error);
  }
};

// Board Güncelleme
export const updateBoard = async (
  req: AuthRequest & { body: UpdateBoardRequest },
  res: Response
) => {
  try {
    const { name, description } = req.body;
    const board = await checkBoardOwnership(
      req.user._id.toString(),
      req.params.id
    );

    const oldName = board.name; // Eski board adını saklayalım
    if (name) board.name = name;
    if (description) board.description = description;

    const updatedBoard = await board.save();

    // Tüm üyelere bildirim gönder (board sahibi hariç)
    const notifications = board.members
      .filter((memberId) => memberId.toString() !== req.user._id.toString())
      .map((memberId) => ({
        recipient: memberId,
        sender: req.user._id,
        board: board._id,
        type: NotificationType.BOARD_UPDATED,
        priority: NotificationPriority.LOW,
        message: `The board "${oldName}" has been updated`,
        metadata: {
          oldName,
          newName: name || oldName,
          updatedBy: req.user._id,
          changes: {
            nameChanged: Boolean(name),
            descriptionChanged: Boolean(description),
          },
        },
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json(updatedBoard);
  } catch (error) {
    handleServerError(res, error);
  }
};

// Board Silme
export const deleteBoard = async (req: AuthRequest, res: Response) => {
  try {
    const board = await checkBoardOwnership(
      req.user._id.toString(),
      req.params.id
    );

    // Tüm üyelere bildirim gönder (board sahibi hariç)
    const notifications = board.members
      .filter((memberId) => memberId.toString() !== req.user._id.toString())
      .map((memberId) => ({
        recipient: memberId,
        sender: req.user._id,
        board: board._id,
        type: NotificationType.BOARD_DELETED,
        priority: NotificationPriority.HIGH, // Silme işlemi önemli olduğu için HIGH priority
        message: `The board "${board.name}" has been deleted`,
        metadata: {
          boardName: board.name,
          deletedBy: req.user._id,
          deletedAt: new Date(),
        },
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    await board.deleteOne();
    res.json({ message: "Board removed" });
  } catch (error) {
    handleServerError(res, error);
  }
};

// Board'a yeni kolon ekleme
export const addColumnToBoard = async (
  req: AuthRequest & { body: AddColumnRequest },
  res: Response
) => {
  try {
    const board = await checkBoardAccess(
      req.params.boardId,
      req.user._id,
      false
    );

    if (board.columns.length >= 10) {
      return res.status(400).json({
        message: "Maximum column limit (10) reached",
      });
    }

    const {
      name,
      type = ColumnType.CUSTOM,
      color = "#E2E8F0",
      limit,
    } = req.body;
    const order = board.columns.length;

    const newColumn: IColumnData = {
      name,
      type,
      order,
      isDefault: false,
      color,
      limit,
      tasks: [],
    };

    board.columns.push(newColumn);
    await board.save();

    // Yeni kolonu response olarak dönerken _id'yi de ekle
    const savedColumn = board.columns[board.columns.length - 1];

    res.status(201).json({
      _id: savedColumn._id, // MongoDB'nin oluşturduğu _id
      name: savedColumn.name,
      type: savedColumn.type,
      order: savedColumn.order,
      isDefault: savedColumn.isDefault,
      color: savedColumn.color,
      limit: savedColumn.limit,
      boardId: board._id,
    });
  } catch (error) {
    handleServerError(res, error);
  }
};

// Kolon güncelleme
export const updateBoardColumn = async (
  req: AuthRequest & { body: UpdateColumnRequest },
  res: Response
) => {
  try {
    const { boardId, columnId } = req.params; // Get columnId from params instead of body
    const { name, type, color, limit } = req.body; // Destructure the actual fields we expect

    const board = await checkBoardAccess(boardId, req.user._id, false);

    const columnIndex = board.columns.findIndex(
      (col: any) => col._id.toString() === columnId
    );

    if (columnIndex === -1) {
      return res.status(404).json({ message: "Column not found" });
    }

    const column = board.columns[columnIndex];

    // Varsayılan kolonları koruma
    if (column.isDefault && type) {
      return res.status(400).json({
        message: "Cannot change type of default column",
      });
    }

    // Update column fields
    Object.assign(column, {
      name: name ?? column.name,
      type: type ?? column.type,
      color: color ?? column.color,
      limit: limit ?? column.limit,
    });

    await board.save();
    res.json(column);
  } catch (error) {
    handleServerError(res, error);
  }
};

// Kolon silme
export const deleteBoardColumn = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, columnId } = req.params;
    const board = await checkBoardAccess(boardId, req.user._id, true);

    const columnIndex = board.columns.findIndex(
      (col: any) => col._id.toString() === columnId
    );

    if (columnIndex === -1) {
      return res.status(404).json({ message: "Column not found" });
    }

    const column = board.columns[columnIndex];

    if (column.isDefault) {
      return res.status(400).json({
        message: "Cannot delete default column",
      });
    }

    // Remove the column
    board.columns.splice(columnIndex, 1);

    // Reorder remaining columns
    board.columns.forEach((col, index) => {
      if (col.order > column.order) {
        col.order -= 1;
      }
    });

    await board.save();
    res.json({ message: "Column deleted successfully" });
  } catch (error) {
    handleServerError(res, error);
  }
};

// Kolon sırasını güncelleme
export const updateColumnOrder = async (
  req: AuthRequest & { body: UpdateColumnOrderRequest },
  res: Response
) => {
  try {
    const { boardId } = req.params;
    const { columnId, newOrder } = req.body;
    const board = await checkBoardAccess(boardId, req.user._id, false);

    const columnIndex = board.columns.findIndex(
      (col: any) => col._id.toString() === columnId
    );

    if (columnIndex === -1) {
      return res.status(404).json({ message: "Column not found" });
    }

    if (newOrder < 0 || newOrder >= board.columns.length) {
      return res.status(400).json({
        message: "Invalid order value",
      });
    }

    const column = board.columns[columnIndex];
    const oldOrder = column.order;

    // Update orders
    board.columns.forEach((col) => {
      if (newOrder > oldOrder) {
        if (col.order <= newOrder && col.order > oldOrder) {
          col.order -= 1;
        }
      } else {
        if (col.order >= newOrder && col.order < oldOrder) {
          col.order += 1;
        }
      }
    });

    column.order = newOrder;

    // Sort columns by order
    board.columns.sort((a, b) => a.order - b.order);

    await board.save();
    res.json({ message: "Column order updated successfully" });
  } catch (error) {
    handleServerError(res, error);
  }
};

// Davetleri Getirme
export const getMyInvitations = async (req: AuthRequest, res: Response) => {
  try {
    const invitations = await BoardInvitation.find({
      invitedUser: req.user._id,
      isAccepted: false,
      expiresAt: { $gt: new Date() }, // Süresi geçmemiş davetler
    })
      .populate("board", "name description")
      .populate("invitedBy", "name email");

    res.json(invitations);
  } catch (error) {
    handleServerError(res, error);
  }
};

// Üye Çıkartma
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, memberId } = req.params;
    const board = await checkBoardOwnership(req.user._id.toString(), boardId);

    const memberExists = board.members.some(
      (member) => member.toString() === memberId
    );

    if (!memberExists) {
      return res.status(404).json({ message: "Member not found in board" });
    }

    await Board.findByIdAndUpdate(
      boardId,
      { $pull: { members: memberId } },
      { new: true }
    );

    // Çıkarılan üyeye bildirim gönder
    await Notification.create({
      recipient: new Types.ObjectId(memberId),
      sender: req.user._id,
      board: board._id,
      type: NotificationType.MEMBER_REMOVED,
      priority: NotificationPriority.MEDIUM,
      message: `You have been removed from the board "${board.name}"`,
      metadata: {
        boardName: board.name,
        removedBy: req.user._id,
      },
    });

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    handleServerError(res, error);
  }
};

// Davet Gönderme
export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    const board = await checkBoardOwnership(
      req.user._id.toString(),
      req.params.id
    );

    const invitedUser = await User.findOne({
      email: new RegExp(`^${email}$`, "i"),
    });

    if (!invitedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUser = await User.findById(req.user._id);

    if (currentUser?.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({
        message: "You cannot invite yourself to the board",
      });
    }

    if (
      board.members.some((m) => m.toString() === invitedUser._id.toString())
    ) {
      return res.status(400).json({ message: "User is already a member" });
    }

    // Mevcut aktif davetleri kontrol et
    const existingInvitation = await BoardInvitation.findOne({
      board: board._id,
      invitedUser: invitedUser._id,
      isAccepted: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      return res.status(400).json({ message: "Invitation already sent" });
    }

    // Davet için son kullanma tarihi oluştur (7 gün)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Davet oluştur
    const invitation = await BoardInvitation.create({
      board: board._id,
      invitedBy: req.user._id,
      invitedUser: invitedUser._id,
      expiresAt,
      isAccepted: false,
    });

    // Bildirim oluştur
    const notification = await Notification.create({
      recipient: invitedUser._id,
      sender: req.user._id,
      board: board._id,
      type: NotificationType.BOARD_INVITATION,
      priority: NotificationPriority.MEDIUM,
      message: `${currentUser?.name} invited you to join the board "${board.name}"`,
      metadata: {
        invitationId: invitation._id,
        boardName: board.name,
        invitedBy: {
          id: currentUser?._id,
          name: currentUser?.name,
        },
      },
      isRead: false,
    });

    // Başarılı yanıt dön
    res.status(200).json({
      message: "Invitation sent",
      invitation,
      notification,
      notificationSent: true,
    });
  } catch (error) {
    console.error("Error in inviteMember:", error);
    res.status(500).json({
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Davete Yanıt Verme
export const respondToInvitation = async (
  req: AuthRequest & { user: UserDocument },
  res: Response
) => {
  try {
    const { invitationId } = req.params;
    const { accept } = req.body;
    const userId = req.user._id;

    // Davetiyeyi bul
    const invitation = await BoardInvitation.findOne({
      _id: invitationId,
      invitedUser: userId,
      isAccepted: false,
    }).populate<{ board: BoardDocument }>("board");

    if (!invitation || !invitation.board) {
      return res.status(404).json({ message: "Invitation or board not found" });
    }

    const board = invitation.board;
    let notificationMessage: string;
    let notificationType: NotificationType;

    if (accept) {
      await Board.findByIdAndUpdate(board._id, {
        $addToSet: { members: userId },
      });
      await BoardInvitation.findByIdAndUpdate(invitationId, {
        isAccepted: true,
      });

      notificationMessage = `${req.user.name} accepted your invitation to join "${board.name}"`;
      notificationType = NotificationType.MEMBER_ADDED;
    } else {
      await invitation.deleteOne();
      notificationMessage = `${req.user.name} declined your invitation to join "${board.name}"`;
      notificationType = NotificationType.MEMBER_REMOVED;
    }

    await createNotification({
      recipientId: new Types.ObjectId(invitation.invitedBy.toString()),
      senderId: new Types.ObjectId(userId.toString()),
      boardId: new Types.ObjectId(board._id.toString()),
      type: notificationType,
      message: notificationMessage,
      metadata: {
        boardName: board.name,
        invitationId: invitation._id,
        action: accept ? "accepted" : "declined",
      },
    });

    return res.json({
      message: accept ? "Invitation accepted" : "Invitation rejected",
      board: accept ? board : null,
      success: true,
      notification: { type: notificationType, message: notificationMessage },
    });
  } catch (error) {
    console.error("Error in respondToInvitation:", error);
    return res.status(500).json({
      message: "Failed to process invitation",
      error:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    });
  }
};

// Board'dan Çıkma
export const leaveBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (board.owner.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Board owner cannot leave the board" });
    }

    const isMember = board.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res
        .status(400)
        .json({ message: "You are not a member of this board" });
    }

    await Board.findByIdAndUpdate(
      boardId,
      { $pull: { members: req.user._id } },
      { new: true }
    );

    // Board sahibine bildirim gönder
    await Notification.create({
      recipient: board.owner,
      sender: req.user._id,
      board: board._id,
      type: NotificationType.MEMBER_LEFT,
      priority: NotificationPriority.LOW,
      message: `A member has left your board "${board.name}"`,
      metadata: {
        boardName: board.name,
        memberId: req.user._id,
      },
    });

    res.json({ message: "Successfully left the board" });
  } catch (error) {
    handleServerError(res, error);
  }
};
