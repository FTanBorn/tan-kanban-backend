// src/services/taskService.ts
import { Types } from "mongoose";
import Board, {
  ITask,
  TaskStatus,
  TaskPriority,
  IBoard,
  IComment,
  IColumnData,
} from "../models/Board";
import { NotificationType, NotificationPriority } from "../models/Notification";
import Notification from "../models/Notification";
import User from "../models/User";

// Interface tanımlamaları
interface CreateTaskDTO {
  title: string;
  description?: string;
  columnId: string;
  priority?: TaskPriority;
  dueDate?: Date;
  assignees?: string[];
  labels?: string[];
}

interface UpdateTaskDTO {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  status?: TaskStatus;
  labels?: string[];
  assignees?: string[];
}

interface MoveTaskDTO {
  targetColumnId: string;
  order: number;
}

interface IUserInfo {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

interface ITaskResponse extends Omit<ITask, "assignees"> {
  assignees: IUserInfo[];
}

export class TaskService {
  private static async populateTaskData(
    board: IBoard,
    task: ITask
  ): Promise<ITaskResponse> {
    const populatedBoard = await Board.findById(board._id).populate(
      "members",
      "name email"
    );

    if (!populatedBoard) {
      throw new Error("Board not found");
    }

    const populatedAssignees =
      task.assignees?.map((assigneeId) => {
        const member = populatedBoard.members.find(
          (m) => m._id.toString() === assigneeId.toString()
        );
        return member
          ? {
              _id: member._id,
              name: (member as any).name,
              email: (member as any).email,
            }
          : {
              _id: assigneeId,
              name: "Unknown",
              email: "unknown@email.com",
            };
      }) || [];

    return {
      ...task,
      assignees: populatedAssignees,
    };
  }

  private static async notifyTaskCompletion(
    task: ITask,
    boardId: string,
    userId: string
  ): Promise<void> {
    if (!task.assignees?.length) return;

    const notifications = task.assignees
      .filter((assignee) => assignee.toString() !== userId)
      .map((assignee) => ({
        recipient: assignee,
        sender: new Types.ObjectId(userId),
        board: new Types.ObjectId(boardId),
        type: NotificationType.TASK_COMPLETED,
        priority: NotificationPriority.LOW,
        message: `Task "${task.title}" has been marked as completed`,
        metadata: {
          taskId: task._id,
          boardId,
        },
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  }

  private static findTaskInBoard(
    board: IBoard,
    taskId: string
  ): {
    task: ITask | null;
    column: IColumnData | null;
    taskIndex: number;
  } {
    let foundTask: ITask | null = null;
    let foundColumn: IColumnData | null = null;
    let taskIndex = -1;

    for (const column of board.columns) {
      const index = column.tasks.findIndex((t) => t._id?.toString() === taskId);
      if (index !== -1) {
        foundTask = column.tasks[index];
        foundColumn = column;
        taskIndex = index;
        break;
      }
    }

    return { task: foundTask, column: foundColumn, taskIndex };
  }

  private static normalizeTaskOrders(column: IColumnData): void {
    column.tasks.sort((a, b) => a.order - b.order);
    column.tasks.forEach((task, index) => {
      task.order = index;
    });
  }

  static async createTask(
    dto: CreateTaskDTO,
    userId: string
  ): Promise<ITaskResponse> {
    try {
      const board = await Board.findOne({ "columns._id": dto.columnId });

      if (!board) {
        throw new Error("Board not found for this column");
      }

      const column = board.columns.find(
        (col) => col._id?.toString() === dto.columnId
      );

      if (!column) {
        throw new Error("Column not found");
      }

      if (column.limit && column.tasks.length >= column.limit) {
        throw new Error("Column task limit reached");
      }

      const newOrder = column.tasks.length;

      const newTask: ITask = {
        _id: new Types.ObjectId(),
        title: dto.title,
        description: dto.description || "",
        priority: dto.priority || TaskPriority.LOW,
        status: TaskStatus.TODO,
        dueDate: dto.dueDate,
        assignees: dto.assignees?.map((id) => new Types.ObjectId(id)) || [],
        labels: dto.labels || [],
        order: newOrder,
        columnId: dto.columnId,
        comments: [],
      };

      column.tasks.push(newTask);
      await board.save();

      if (dto.assignees?.length) {
        const notifications = dto.assignees.map((assigneeId) => ({
          recipient: new Types.ObjectId(assigneeId),
          sender: new Types.ObjectId(userId),
          board: board._id,
          type: NotificationType.ASSIGNED,
          priority: NotificationPriority.MEDIUM,
          message: `You have been assigned to task "${dto.title}"`,
          metadata: {
            taskId: newTask._id,
            boardId: board._id,
            columnId: dto.columnId,
          },
        }));

        await Notification.insertMany(notifications);
      }

      const assigneeDetails = await User.find(
        { _id: { $in: newTask.assignees } },
        "name email"
      );

      return {
        _id: newTask._id,
        title: newTask.title,
        description: newTask.description || "",
        status: newTask.status,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        labels: newTask.labels || [],
        comments: newTask.comments || [],
        order: newTask.order,
        columnId: newTask.columnId,
        assignees: assigneeDetails.map((assignee: any) => ({
          _id: assignee._id,
          name: assignee.name,
          email: assignee.email,
        })),
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateTask(
    taskId: string,
    boardId: string,
    updates: UpdateTaskDTO,
    userId: string
  ): Promise<ITaskResponse> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task, column } = this.findTaskInBoard(board, taskId);
    if (!task || !column) {
      throw new Error("Task not found");
    }

    Object.assign(task, {
      ...updates,
      comments: task.comments || [],
      assignees: updates.assignees
        ? updates.assignees.map((id) => new Types.ObjectId(id))
        : task.assignees || [],
    });

    await board.save();

    if (updates.status === TaskStatus.COMPLETED) {
      await this.notifyTaskCompletion(task, boardId, userId);
    }

    const populatedBoard = await Board.findOne(
      { "columns.tasks._id": taskId },
      { "columns.tasks.$": 1 }
    ).populate("columns.tasks.assignees", "name email");

    if (!populatedBoard || !populatedBoard.columns[0]?.tasks[0]) {
      throw new Error("Updated task not found");
    }

    const updatedTask = populatedBoard.columns[0].tasks[0];

    return {
      _id: updatedTask._id,
      title: updatedTask.title,
      description: updatedTask.description || "",
      status: updatedTask.status,
      priority: updatedTask.priority,
      dueDate: updatedTask.dueDate,
      labels: updatedTask.labels || [],
      comments: updatedTask.comments || [],
      order: updatedTask.order,
      columnId: updatedTask.columnId,
      assignees: (updatedTask.assignees || []).map((assignee) => ({
        _id: assignee._id,
        name: (assignee as any).name || "Unknown",
        email: (assignee as any).email || "unknown@email.com",
      })),
    };
  }

  static async deleteTask(taskId: string, boardId: string): Promise<void> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task, column, taskIndex } = this.findTaskInBoard(board, taskId);
    if (!task || !column || taskIndex === -1) {
      throw new Error("Task not found");
    }

    column.tasks.splice(taskIndex, 1);
    this.normalizeTaskOrders(column); // Sıralamayı yeniden düzenle
    await board.save();
  }

  static async moveTask(
    taskId: string,
    boardId: string,
    { targetColumnId, order }: MoveTaskDTO
  ): Promise<ITaskResponse> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const {
      task,
      column: sourceColumn,
      taskIndex: sourceTaskIndex,
    } = this.findTaskInBoard(board, taskId);
    if (!task || !sourceColumn || sourceTaskIndex === -1) {
      throw new Error("Task not found");
    }

    const targetColumn = board.columns.find(
      (col) => col._id?.toString() === targetColumnId
    );

    if (!targetColumn) {
      throw new Error("Target column not found");
    }

    if (targetColumn.limit && targetColumn.tasks.length >= targetColumn.limit) {
      throw new Error("Target column task limit reached");
    }

    // Task'ı kaynak kolondan çıkar
    sourceColumn.tasks.splice(sourceTaskIndex, 1);
    this.normalizeTaskOrders(sourceColumn); // Kaynak kolonun sıralamasını yeniden düzenle

    // Task'ı hedef kolona ekle
    task.columnId = targetColumnId;
    task.order = order;
    targetColumn.tasks.splice(order, 0, task);
    this.normalizeTaskOrders(targetColumn); // Hedef kolonun sıralamasını yeniden düzenle

    await board.save();
    return await this.populateTaskData(board, task);
  }

  static async getTasks(boardId: string, columnId: string): Promise<ITask[]> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const column = board.columns.find(
      (col) => col._id?.toString() === columnId
    );

    if (!column) {
      throw new Error("Column not found");
    }

    return column.tasks.sort((a, b) => a.order - b.order);
  }

  static async getTaskById(
    boardId: string,
    taskId: string
  ): Promise<ITaskResponse | null> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task } = this.findTaskInBoard(board, taskId);
    if (!task) {
      return null;
    }

    return await this.populateTaskData(board, task);
  }

  static async addComment(
    taskId: string,
    boardId: string,
    content: string,
    userId: string
  ): Promise<ITaskResponse> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task } = this.findTaskInBoard(board, taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.comments) {
      task.comments = [];
    }

    const comment: IComment = {
      _id: new Types.ObjectId(),
      content,
      createdBy: new Types.ObjectId(userId),
      createdAt: new Date(),
    };

    task.comments.push(comment);
    await board.save();

    await this.handleMentions(task, content, userId, boardId);

    return await this.populateTaskData(board, task);
  }

  static async updateComment(
    taskId: string,
    boardId: string,
    commentId: string,
    content: string,
    userId: string
  ): Promise<ITaskResponse> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task } = this.findTaskInBoard(board, taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.comments) {
      throw new Error("Comments not initialized");
    }

    const comment = task.comments.find((c) => c._id?.toString() === commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.createdBy.toString() !== userId) {
      throw new Error("Not authorized to update this comment");
    }

    comment.content = content;
    await board.save();

    return await this.populateTaskData(board, task);
  }

  static async deleteComment(
    taskId: string,
    boardId: string,
    commentId: string,
    userId: string
  ): Promise<ITaskResponse> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task } = this.findTaskInBoard(board, taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.comments) {
      throw new Error("Comments not initialized");
    }

    const commentIndex = task.comments.findIndex(
      (c) => c._id?.toString() === commentId
    );
    if (commentIndex === -1) {
      throw new Error("Comment not found");
    }

    if (task.comments[commentIndex].createdBy.toString() !== userId) {
      throw new Error("Not authorized to delete this comment");
    }

    task.comments.splice(commentIndex, 1);
    await board.save();

    return await this.populateTaskData(board, task);
  }

  static async assignUser(
    taskId: string,
    boardId: string,
    assigneeId: string,
    userId: string
  ): Promise<ITaskResponse> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task } = this.findTaskInBoard(board, taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.assignees) {
      task.assignees = [];
    }

    const assigneeObjectId = new Types.ObjectId(assigneeId);
    if (!task.assignees.some((id) => id.equals(assigneeObjectId))) {
      task.assignees.push(assigneeObjectId);
      await board.save();

      await Notification.create({
        recipient: assigneeObjectId,
        sender: new Types.ObjectId(userId),
        board: new Types.ObjectId(boardId),
        type: NotificationType.ASSIGNED,
        priority: NotificationPriority.MEDIUM,
        message: `You have been assigned to task "${task.title}"`,
        metadata: {
          taskId: task._id,
          boardId,
        },
      });
    }

    return await this.populateTaskData(board, task);
  }

  static async unassignUser(
    taskId: string,
    boardId: string,
    assigneeId: string
  ): Promise<ITaskResponse> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task } = this.findTaskInBoard(board, taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (!task.assignees) {
      task.assignees = [];
    }

    task.assignees = task.assignees.filter(
      (id) => id.toString() !== assigneeId
    );
    await board.save();

    return await this.populateTaskData(board, task);
  }

  private static async handleMentions(
    task: ITask,
    content: string,
    userId: string,
    boardId: string
  ): Promise<void> {
    const mentionRegex = /@\[([^\]]+)\]\((\w+)\)/g;
    const mentions = new Set<string>();
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.add(match[2]);
    }

    if (mentions.size > 0) {
      const notifications = Array.from(mentions).map((mentionedUserId) => ({
        recipient: new Types.ObjectId(mentionedUserId),
        sender: new Types.ObjectId(userId),
        board: new Types.ObjectId(boardId),
        type: NotificationType.MENTIONED,
        priority: NotificationPriority.MEDIUM,
        message: `You were mentioned in task "${task.title}"`,
        metadata: {
          taskId: task._id,
          boardId,
        },
      }));

      await Notification.insertMany(notifications);
    }
  }
}
