// src/services/boardInvitationService.ts
import { Types } from "mongoose";
import BoardInvitation from "../models/BoardInvitation";
import Notification from "../models/Notification";
import { NotificationType, NotificationPriority } from "../models/Notification";
import Board from "../models/Board";
import User from "../models/User";

export class BoardInvitationService {
  // Davet oluşturma
  static async createInvitation(
    boardId: Types.ObjectId,
    invitedByUserId: Types.ObjectId,
    invitedUserEmail: string
  ) {
    const invitedUser = await User.findOne({ email: invitedUserEmail });
    if (!invitedUser) {
      throw new Error("Invited user not found");
    }

    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Mevcut aktif davet kontrolü
    const existingInvitation = await BoardInvitation.findOne({
      board: boardId,
      invitedUser: invitedUser._id,
      isAccepted: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      throw new Error("Invitation already exists");
    }

    // Davet oluştur
    const invitation = await BoardInvitation.create({
      board: boardId,
      invitedBy: invitedByUserId,
      invitedUser: invitedUser._id,
    });

    // Bildirim oluştur
    await Notification.create({
      recipient: invitedUser._id,
      sender: invitedByUserId,
      board: boardId,
      type: NotificationType.BOARD_INVITATION,
      priority: NotificationPriority.MEDIUM,
      message: `You have been invited to join the board "${board.name}"`,
      metadata: {
        invitationId: invitation._id,
        boardName: board.name,
      },
    });

    return invitation;
  }

  // Davete yanıt verme
  static async handleInvitationResponse(
    invitationId: Types.ObjectId,
    userId: Types.ObjectId,
    accept: boolean
  ) {
    const invitation = await BoardInvitation.findOne({
      _id: invitationId,
      expiresAt: { $gt: new Date() },
      isAccepted: false,
    });

    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    if (invitation.invitedUser.toString() !== userId.toString()) {
      throw new Error("Not authorized");
    }

    const board = await Board.findById(invitation.board);
    if (!board) {
      throw new Error("Board not found");
    }

    if (accept) {
      // Board'a üye ekle
      board.members.push(userId);
      await board.save();

      // Daveti kabul edildi olarak işaretle
      invitation.isAccepted = true;
      await invitation.save();

      // Board sahibine bildirim gönder
      await Notification.create({
        recipient: board.owner,
        sender: userId,
        board: board._id,
        type: NotificationType.MEMBER_ADDED,
        priority: NotificationPriority.LOW,
        message: `A new member has joined your board "${board.name}"`,
        metadata: {
          boardName: board.name,
          newMemberId: userId,
        },
      });
    } else {
      // Daveti sil
      await invitation.deleteOne();

      // Reddedildi bildirimi gönder
      await Notification.create({
        recipient: invitation.invitedBy,
        sender: userId,
        board: board._id,
        type: NotificationType.BOARD_INVITATION,
        priority: NotificationPriority.LOW,
        message: `Your invitation to board "${board.name}" was declined`,
        metadata: {
          boardName: board.name,
        },
      });
    }

    return { success: true };
  }

  // Davetleri temizle
  static async cleanupExpiredInvitations() {
    const expiredInvitations = await BoardInvitation.find({
      expiresAt: { $lt: new Date() },
      isAccepted: false,
    });

    // Süresi geçmiş davetler için bildirim gönder
    for (const invitation of expiredInvitations) {
      await Notification.create({
        recipient: invitation.invitedBy,
        sender: invitation.invitedBy,
        board: invitation.board,
        type: NotificationType.BOARD_INVITATION,
        priority: NotificationPriority.LOW,
        message: `Your invitation has expired`,
        metadata: {
          invitationId: invitation._id,
        },
      });
    }

    await BoardInvitation.deleteMany({
      expiresAt: { $lt: new Date() },
      isAccepted: false,
    });
  }
}
