// src/services/taskService.ts
import { Types } from "mongoose";
import Board, {
  ITask,
  TaskStatus,
  TaskPriority,
  IBoard,
  IComment,
} from "../models/Board";
import { NotificationType, NotificationPriority } from "../models/Notification";
import Notification from "../models/Notification";

interface CreateTaskDTO {
  title: string;
  description?: string;
  columnId: string; // boardId yerine columnId
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
}

interface MoveTaskDTO {
  targetColumnId: string;
  order: number;
}

export class TaskService {
  // Task oluşturma
  static async createTask(dto: CreateTaskDTO, userId: string): Promise<ITask> {
    try {
      // columnId kontrolü
      if (!Types.ObjectId.isValid(dto.columnId)) {
        throw new Error("Invalid column ID");
      }

      // Board'u kolondan bulalım
      const board = await Board.findOne({
        "columns._id": dto.columnId,
      });

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

      const order =
        column.tasks.length > 0
          ? Math.max(...column.tasks.map((task) => task.order)) + 1
          : 0;

      const newTask: ITask = {
        _id: new Types.ObjectId(),
        title: dto.title,
        description: dto.description || "",
        priority: dto.priority || TaskPriority.LOW,
        status: TaskStatus.TODO,
        dueDate: dto.dueDate,
        assignees:
          dto.assignees
            ?.map((id) =>
              Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null
            )
            .filter((id): id is Types.ObjectId => id !== null) || [],
        labels: dto.labels || [],
        order,
        comments: [],
        columnId: dto.columnId, // columnId kullanıyoruz
      };

      column.tasks.push(newTask);
      await board.save();

      // Bildirim kısmı
      if (dto.assignees?.length) {
        const notifications = dto.assignees
          .filter((id) => Types.ObjectId.isValid(id))
          .map((assigneeId) => ({
            recipient: new Types.ObjectId(assigneeId),
            sender: new Types.ObjectId(userId),
            board: board._id, // board._id kullanıyoruz
            type: NotificationType.ASSIGNED,
            priority: NotificationPriority.MEDIUM,
            message: `You have been assigned to task "${dto.title}"`,
            metadata: {
              taskId: newTask._id,
              boardId: board._id, // board._id kullanıyoruz
              columnId: dto.columnId,
            },
          }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      }

      return newTask;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to create task");
    }
  }

  // Tasks'ları getir
  static async getTasks(boardId: string, columnId: string): Promise<ITask[]> {
    if (!Types.ObjectId.isValid(boardId)) {
      throw new Error("Invalid board ID");
    }

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

  // Tekil task getir
  static async getTaskById(
    boardId: string,
    taskId: string
  ): Promise<ITask | null> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task } = this.findTaskInBoard(board, taskId);
    return task;
  }

  // Task güncelleme
  static async updateTask(
    taskId: string,
    boardId: string,
    updates: UpdateTaskDTO,
    userId: string
  ): Promise<ITask> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const { task, column } = this.findTaskInBoard(board, taskId);
    if (!task || !column) {
      throw new Error("Task not found");
    }

    // Update task fields
    Object.assign(task, {
      ...task,
      ...updates,
      comments: task.comments || [],
      assignees: task.assignees || [],
    });

    await board.save();

    // Notify assignees if task is completed
    if (updates.status === TaskStatus.COMPLETED) {
      await this.notifyTaskCompletion(task, boardId, userId);
    }

    return task;
  }

  // Task silme
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
    await board.save();
  }

  // Task taşıma
  static async moveTask(
    taskId: string,
    boardId: string,
    { targetColumnId, order }: MoveTaskDTO
  ): Promise<ITask> {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const {
      task: sourceTask,
      column: sourceColumn,
      taskIndex: sourceTaskIndex,
    } = this.findTaskInBoard(board, taskId);

    // Hedef kolon kontrolü
    const targetColumn = board.columns.find(
      (col) => col._id?.toString() === targetColumnId
    );

    // Task'ı kaynak kolondan çıkar
    sourceColumn.tasks.splice(sourceTaskIndex, 1);

    // Task'ın sıralamasını güncelle
    if (!sourceTask) {
      throw new Error("Source task not found");
    }
    sourceTask.order = order;

    // Hedef kolon kontrolü
    if (!targetColumn) {
      throw new Error("Target column not found");
    }

    // Hedef kolondaki task'ların sıralamasını ayarla
    targetColumn.tasks.forEach((task) => {
      if (task.order >= order) {
        task.order += 1;
      }
    });

    // Task'ı hedef kolona ekle
    targetColumn.tasks.push(sourceTask);

    await board.save();
    return sourceTask;
  }

  // Yorum ekleme
  static async addComment(
    taskId: string,
    boardId: string,
    content: string,
    userId: string
  ): Promise<ITask> {
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
    return task;
  }

  // Yorum güncelleme
  static async updateComment(
    taskId: string,
    boardId: string,
    commentId: string,
    content: string,
    userId: string
  ): Promise<ITask> {
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

    return task;
  }

  // Yorum silme
  static async deleteComment(
    taskId: string,
    boardId: string,
    commentId: string,
    userId: string
  ): Promise<ITask> {
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

    return task;
  }

  // Kullanıcı atama
  static async assignUser(
    taskId: string,
    boardId: string,
    assigneeId: string,
    userId: string
  ): Promise<ITask> {
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

    return task;
  }

  // Kullanıcı çıkarma
  static async unassignUser(
    taskId: string,
    boardId: string,
    assigneeId: string
  ): Promise<ITask> {
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
    return task;
  }

  // Private helper methods
  private static findTaskInBoard(
    board: IBoard,
    taskId: string
  ): {
    task: ITask | null;
    column: any | null;
    taskIndex: number;
    columnIndex: number;
  } {
    let foundTask: ITask | null = null;
    let foundColumn: any | null = null;
    let taskIndex = -1;
    let columnIndex = -1;

    board.columns.forEach((col, colIndex) => {
      const tIndex = col.tasks.findIndex((t) => t._id?.toString() === taskId);
      if (tIndex !== -1) {
        foundTask = col.tasks[tIndex];
        foundColumn = col;
        taskIndex = tIndex;
        columnIndex = colIndex;
      }
    });

    return { task: foundTask, column: foundColumn, taskIndex, columnIndex };
  }

  private static async notifyTaskCompletion(
    task: ITask,
    boardId: string,
    userId: string
  ) {
    if (!task.assignees) {
      return;
    }

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

  private static async handleMentions(
    task: ITask,
    content: string,
    userId: string,
    boardId: string
  ) {
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
