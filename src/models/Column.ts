// src/models/Column.ts
import mongoose, { Document, Schema } from "mongoose";
import { ITask } from "./interfaces/Task";

export interface IColumn extends Document {
  name: string;
  board: Schema.Types.ObjectId;
  order: number;
  tasks: ITask[];
  isDefault: boolean;
  type: "todo" | "in-progress" | "done" | "custom";
  color?: string;
  limit?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Task şemasını burada tanımlayalım
const taskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  dueDate: Date,
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
  },
  order: { type: Number, required: true },
  status: String,
});

const columnSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    board: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    tasks: [taskSchema],
    isDefault: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["todo", "in-progress", "done", "custom"],
      default: "custom",
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
  },
  { timestamps: true }
);

export const Column = mongoose.model<IColumn>("Column", columnSchema);
