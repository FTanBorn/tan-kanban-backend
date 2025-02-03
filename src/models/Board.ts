// src/models/Board.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IBoard extends Document {
  name: string;
  description?: string;
  owner: Schema.Types.ObjectId;
  members: Schema.Types.ObjectId[];
}

const boardSchema = new Schema(
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
  },
  { timestamps: true }
);

export default mongoose.model<IBoard>("Board", boardSchema);
