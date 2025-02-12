// src/controllers/taskController.ts
import { Request, Response } from "express";
import { TaskService } from "../services/taskService";
import { AuthRequest } from "../types/express";
import { TaskPriority, TaskStatus } from "../models/Board";

// Request Interfaces
interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  assignees?: string[];
  labels?: string[];
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date;
  labels?: string[];
}

interface MoveTaskRequest {
  targetColumnId: string;
  order: number;
}

interface CommentRequest {
  content: string;
}

// Error Handler
const handleError = (res: Response, error: unknown) => {
  console.error("Error in task controller:", error);
  if (error instanceof Error) {
    return res.status(400).json({ message: error.message });
  }
  return res.status(500).json({ message: "Internal server error" });
};

// Controllers
export const createTask = async (
  req: AuthRequest & { body: CreateTaskRequest },
  res: Response
) => {
  try {
    const { boardId, columnId } = req.params;
    const task = await TaskService.createTask(
      {
        ...req.body,
        boardId,
        columnId,
      },
      req.user._id.toString()
    );

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, columnId } = req.params;
    const tasks = await TaskService.getTasks(boardId, columnId);
    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, taskId } = req.params;
    const task = await TaskService.getTaskById(boardId, taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateTask = async (
  req: AuthRequest & { body: UpdateTaskRequest },
  res: Response
) => {
  try {
    const { boardId, taskId } = req.params;
    const task = await TaskService.updateTask(
      taskId,
      boardId,
      req.body,
      req.user._id.toString()
    );
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const moveTask = async (
  req: AuthRequest & { body: MoveTaskRequest },
  res: Response
) => {
  try {
    const { boardId, taskId } = req.params;
    const { targetColumnId, order } = req.body;

    const task = await TaskService.moveTask(taskId, boardId, {
      targetColumnId,
      order,
    });
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, taskId } = req.params;
    await TaskService.deleteTask(taskId, boardId);
    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const addComment = async (
  req: AuthRequest & { body: CommentRequest },
  res: Response
) => {
  try {
    const { boardId, taskId } = req.params;
    const task = await TaskService.addComment(
      taskId,
      boardId,
      req.body.content,
      req.user._id.toString()
    );
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateComment = async (
  req: AuthRequest & { body: CommentRequest },
  res: Response
) => {
  try {
    const { boardId, taskId, commentId } = req.params;
    const task = await TaskService.updateComment(
      taskId,
      boardId,
      commentId,
      req.body.content,
      req.user._id.toString()
    );
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, taskId, commentId } = req.params;
    const task = await TaskService.deleteComment(
      taskId,
      boardId,
      commentId,
      req.user._id.toString()
    );
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const assignUser = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, taskId, userId } = req.params;
    const task = await TaskService.assignUser(
      taskId,
      boardId,
      userId,
      req.user._id.toString()
    );
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const unassignUser = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, taskId, userId } = req.params;
    const task = await TaskService.unassignUser(taskId, boardId, userId);
    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    handleError(res, error);
  }
};
