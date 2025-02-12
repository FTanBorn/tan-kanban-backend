// src/models/Board.ts
import mongoose, { Document, Schema, Types } from "mongoose";

// Column türlerini enum olarak tanımlıyorum
export enum ColumnType {
  TODO = "todo",
  IN_PROGRESS = "in-progress",
  DONE = "done",
  CUSTOM = "custom",
}

// Column için interface
export interface IColumnData {
  _id?: number;
  name: string;
  order: number;
  isDefault: boolean;
  type: ColumnType;
  color: string;
  limit?: number;
  tasks: ITask[];
}

// Board için interface
export interface IBoardData {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  columns: IColumnData[];
}

// Document tipini genişletiyorum
export interface IBoard extends IBoardData, Document {
  createDefaultColumns(): Promise<void>;
}

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

export interface IComment {
  _id?: Types.ObjectId;
  content: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface ITask {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date;
  assignees?: Types.ObjectId[];
  labels?: string[];
  comments?: IComment[];
  order: number;
  columnId: string;
}

// Comment alt şeması
const commentSchema = new Schema<IComment>({
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Task alt şeması
const taskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: true,
  },
  description: String,
  priority: {
    type: String,
    enum: Object.values(TaskPriority),
  },
  status: {
    type: String,
    enum: Object.values(TaskStatus),
  },
  dueDate: Date,
  assignees: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  labels: [String],
  comments: [commentSchema],
  order: {
    type: Number,
    required: true,
  },
  columnId: {
    type: String,
  },
});

// Column alt şeması
const columnSchema = new Schema<IColumnData>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  order: {
    type: Number,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: Object.values(ColumnType),
    default: ColumnType.CUSTOM,
  },
  color: {
    type: String,
    default: "#E2E8F0",
  },
  limit: {
    type: Number,
    min: 0,
    max: 100,
  },
  tasks: [taskSchema],
});

// Board ana şeması
const boardSchema = new Schema<IBoard>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    columns: [columnSchema],
  },
  { timestamps: true }
);

// Instance method olarak createDefaultColumns'u ekliyorum
boardSchema.methods.createDefaultColumns = async function (this: IBoard) {
  const defaultColumns: IColumnData[] = [
    {
      name: "To Do",
      order: 0,
      isDefault: false,
      type: ColumnType.TODO,
      color: "#EDF2F7",
      tasks: [],
    },
    {
      name: "In Progress",
      order: 1,
      isDefault: true,
      type: ColumnType.IN_PROGRESS,
      color: "#E9ECEF",
      tasks: [],
    },
    {
      name: "Done",
      order: 2,
      isDefault: true,
      type: ColumnType.DONE,
      color: "#E2E8F0",
      tasks: [],
    },
  ];

  this.columns = defaultColumns;
};

// Pre-save middleware
boardSchema.pre("save", async function (this: IBoard, next) {
  if (this.isNew && (!this.columns || this.columns.length === 0)) {
    await this.createDefaultColumns();
  }
  next();
});

const Board = mongoose.model<IBoard>("Board", boardSchema);
export default Board;
