// src/models/Column.ts
import mongoose, { Document, Schema } from "mongoose";
import { ITask, ITaskData } from "./interfaces/Task";

export interface IColumn extends Document {
  name: string;
  board: Schema.Types.ObjectId;
  order: number;
  tasks: ITask[];
}

const taskSchema = new Schema<ITaskData>({
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
  createdAt: Date,
  updatedAt: Date,
});

const columnSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

export default mongoose.model<IColumn>("Column", columnSchema);
