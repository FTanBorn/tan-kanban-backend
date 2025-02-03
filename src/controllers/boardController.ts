// src/controllers/boardController.ts
import { Request, Response } from "express";
import { Types } from "mongoose";
import Board from "../models/Board";
import User from "../models/User";

// Authenticated kullanıcı isteği tipi
interface AuthRequest extends Request {
  user: {
    _id: Types.ObjectId;
  };
}

// Board oluşturma için veri tipi
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

// Board oluşturma işlemi
export const createBoard = async (
  req: AuthRequest & { body: CreateBoardRequest },
  res: Response
) => {
  try {
    const { name, description } = req.body;

    // Yeni board oluşturuyorum
    const board = await Board.create({
      name,
      description,
      owner: req.user._id, // Board sahibi olarak mevcut kullanıcıyı atıyorum
      members: [req.user._id], // Board'a kullanıcıyı üye olarak ekliyorum
    });

    res.status(201).json(board); // Başarılı bir yanıt gönderiyorum
  } catch (error) {
    res.status(500).json({ message: "Server error", error }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};

// Kullanıcının oluşturduğu veya üye olduğu board'ları getirme işlemi
export const getBoards = async (req: AuthRequest, res: Response) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }], // Kullanıcının üye olduğu veya sahibi olduğu board'ları getiriyorum
    }).populate("owner", "name email"); // Owner bilgilerini alıyorum

    res.json(boards); // Board'ları döndürüyorum
  } catch (error) {
    res.status(500).json({ message: "Server error", error }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};

// Board ID'sine göre board bilgisi alıyorum
export const getBoardById = async (req: AuthRequest, res: Response) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!board) {
      return res.status(404).json({ message: "Board not found" }); // Board bulunamadıysa hata döndürüyorum
    }

    // Kullanıcıya yetkisi olmayan bir board'a erişim engellemesi
    if (
      !board.members
        .map((m) => m.toString())
        .includes(req.user._id.toString()) &&
      board.owner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" }); // Yetkisiz erişim engelleniyor
    }

    res.json(board); // Board'ı döndürüyorum
  } catch (error) {
    res.status(500).json({ message: "Server error", error }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};

// Board güncelleme işlemi
export const updateBoard = async (
  req: AuthRequest & { body: UpdateBoardRequest },
  res: Response
) => {
  try {
    const { name, description } = req.body;
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" }); // Board bulunamadıysa hata döndürüyorum
    }

    // Sadece board sahibi güncelleme yapabilir
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" }); // Yetkisiz kullanıcı
    }

    if (name) board.name = name; // Adı güncelliyorum
    if (description) board.description = description; // Açıklamayı güncelliyorum

    const updatedBoard = await board.save();
    res.json(updatedBoard); // Güncellenmiş board'ı döndürüyorum
  } catch (error) {
    res.status(500).json({ message: "Server error", error }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};

// Board silme işlemi
export const deleteBoard = async (req: AuthRequest, res: Response) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" }); // Board bulunamadıysa hata döndürüyorum
    }

    // Board'u sadece sahibi silebilir
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" }); // Yetkisiz kullanıcı
    }

    await board.deleteOne(); // Board'u siliyorum
    res.json({ message: "Board removed" }); // Board silindi mesajı döndürüyorum
  } catch (error) {
    res.status(500).json({ message: "Server error", error }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};

// Board'a yeni üye ekleme işlemi
export const addMember = async (
  req: AuthRequest & { body: AddMemberRequest },
  res: Response
) => {
  try {
    const { email } = req.body;
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" }); // Board bulunamadıysa hata döndürüyorum
    }

    // Yalnızca board sahibi yeni üye ekleyebilir
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" }); // Yetkisiz kullanıcı
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" }); // Kullanıcı bulunamazsa hata dönüyorum
    }

    const memberExists = board.members.some(
      (memberId) => memberId.toString() === user._id.toString()
    );

    if (memberExists) {
      return res.status(400).json({ message: "User already a member" }); // Kullanıcı zaten üye ise hata dönüyorum
    }

    board.members.push(user._id); // Yeni üyeyi ekliyorum
    await board.save();

    res.json(board); // Güncellenmiş board'ı döndürüyorum
  } catch (error) {
    res.status(500).json({ message: "Server error", error }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};

// Board'dan üye silme işlemi
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, memberId } = req.params;
    const board = await Board.findById(boardId);

    if (!board) {
      return res.status(404).json({ message: "Board not found" }); // Board bulunamadıysa hata döndürüyorum
    }

    // Yalnızca board sahibi üye silebilir
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" }); // Yetkisiz kullanıcı
    }

    // Üyenin board'da olup olmadığını kontrol ediyorum
    const memberExists = board.members.some(
      (member) => member.toString() === memberId
    );

    if (!memberExists) {
      return res.status(404).json({ message: "Member not found in board" }); // Üye board'da yoksa hata döndürüyorum
    }

    // Üyeyi board'dan kaldırıyorum
    board.members = board.members.filter(
      (member) => member.toString() !== memberId
    );

    await board.save(); // Board'u kaydediyorum
    res.json({ message: "Member removed successfully" }); // Başarı mesajı döndürüyorum
  } catch (error) {
    res.status(500).json({ message: "Server error", error }); // Sunucu hatası durumunda hata mesajı döndürüyorum
  }
};
