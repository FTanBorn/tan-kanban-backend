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
      isDefault: true,
      type: ColumnType.TODO,
      color: "#EDF2F7",
    },
    {
      name: "In Progress",
      order: 1,
      isDefault: true,
      type: ColumnType.IN_PROGRESS,
      color: "#E9ECEF",
    },
    {
      name: "Done",
      order: 2,
      isDefault: true,
      type: ColumnType.DONE,
      color: "#E2E8F0",
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
