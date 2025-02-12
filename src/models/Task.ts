// src/models/Task.ts
import mongoose, { Document, Schema, Types, Model } from "mongoose";
import TaskActivity, { TaskActivityType, ITaskChange } from "./TaskActivity";

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  BLOCKED = "blocked",
}

// Yorum için interface
export interface IComment {
  _id: Types.ObjectId;
  content: string;
  author: Types.ObjectId;
  mentions?: Types.ObjectId[];
  replyTo?: Types.ObjectId;
  isEdited: boolean;
  editHistory?: {
    content: string;
    editedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// Attachment interface
export interface IAttachment {
  _id: Types.ObjectId;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

// Task için interface
export interface ITask extends Document {
  title: string;
  description: string;
  board: Types.ObjectId;
  column: Types.ObjectId;
  status: TaskStatus;
  creator: Types.ObjectId;
  assignees: Types.ObjectId[];
  priority: TaskPriority;
  dueDate?: Date;
  order: number;
  labels: string[];
  attachments: IAttachment[];
  comments: IComment[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  logActivity(
    type: TaskActivityType,
    userId: Types.ObjectId,
    changes: ITaskChange[],
    metadata?: Record<string, any>
  ): Promise<void>;
}

interface ITaskModel extends Model<ITask> {
  findOneAndUpdate: any;
  findOne: any;
}

// Yorum şeması
const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [
      {
        content: String,
        editedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

// Attachment şeması
const attachmentSchema = new Schema<IAttachment>({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

// Task şeması
const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 50000,
    },
    board: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },
    column: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
    },
    dueDate: {
      type: Date,
    },
    order: {
      type: Number,
      required: true,
    },
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [attachmentSchema],
    comments: [commentSchema],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Full-text search için index
taskSchema.index({ title: "text", description: "text" });

// Activity log method
taskSchema.methods.logActivity = async function (
  type: TaskActivityType,
  userId: Types.ObjectId,
  changes: ITaskChange[],
  metadata: Record<string, any> = {}
) {
  await TaskActivity.create({
    task: this._id,
    type,
    user: userId,
    changes,
    metadata,
  });
};

// Middleware'ler
taskSchema.pre("save", async function (next) {
  const isNew = this.isNew;

  // Yeni task için sıralama değeri
  if (isNew) {
    const Task = this.constructor as ITaskModel;
    const lastTask = await Task.findOne(
      { board: this.get("board"), column: this.get("column") },
      { order: 1 },
      { sort: { order: -1 } }
    );
    this.set("order", lastTask ? lastTask.order + 1 : 0);
  }

  // Değişiklikleri kontrol et
  if (!isNew && this.isModified()) {
    const changes: ITaskChange[] = [];
    this.modifiedPaths().forEach((path) => {
      const oldValue = this.get(path);
      const newValue = this.get(path);
      if (oldValue !== newValue) {
        changes.push({
          field: path,
          oldValue,
          newValue,
        });
      }
    });

    if (changes.length > 0) {
      await this.logActivity(
        TaskActivityType.UPDATED,
        this.get("creator"),
        changes
      );
    }
  }

  next();
});

// İndeksler
taskSchema.index({ board: 1, column: 1, order: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ isArchived: 1 });

const Task = mongoose.model<ITask, ITaskModel>("Task", taskSchema);
export default Task;
