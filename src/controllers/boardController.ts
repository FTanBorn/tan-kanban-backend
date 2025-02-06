// src/controllers/boardController.ts
import { Request, Response } from "express";
import { Types, Document } from "mongoose";
import Board from "../models/Board";
import User from "../models/User";
import BoardInvitation from "../models/BoardInvitation";
import { NotificationType, NotificationPriority } from "../models/Notification";
import Notification from "../models/Notification";

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
  console.error(error);
  res.status(500).json({ message: "Server error" });
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
    res.status(201).json(board);
  } catch (error) {
    handleServerError(res, error);
  }
};

// Board'ları Getirme
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

    if (name) board.name = name;
    if (description) board.description = description;

    const updatedBoard = await board.save();
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
    await board.deleteOne();
    res.json({ message: "Board removed" });
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

    res.json({ message: "Successfully left the board" });
  } catch (error) {
    handleServerError(res, error);
  }
};
