// src/models/TaskActivity.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export enum TaskActivityType {
  CREATED = "created",
  UPDATED = "updated",
  DELETED = "deleted",
  MOVED = "moved",
  ASSIGNED = "assigned",
  UNASSIGNED = "unassigned",
  COMPLETED = "completed",
  REOPENED = "reopened",
  ARCHIVED = "archived",
  RESTORED = "restored",
  DUE_DATE_CHANGED = "due_date_changed",
  PRIORITY_CHANGED = "priority_changed",
  LABEL_ADDED = "label_added",
  LABEL_REMOVED = "label_removed",
  COMMENT_ADDED = "comment_added",
  COMMENT_UPDATED = "comment_updated",
  COMMENT_DELETED = "comment_deleted",
  ATTACHMENT_ADDED = "attachment_added",
  ATTACHMENT_REMOVED = "attachment_removed",
}

export interface ITaskChange {
  field: string;
  oldValue?: any;
  newValue?: any;
}

export interface ITaskActivity extends Document {
  task: Types.ObjectId;
  type: TaskActivityType;
  user: Types.ObjectId;
  changes: ITaskChange[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

const taskActivitySchema = new Schema<ITaskActivity>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TaskActivityType),
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changes: [
      {
        field: {
          type: String,
          required: true,
        },
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Performance için indeksler
taskActivitySchema.index({ task: 1, createdAt: -1 });
taskActivitySchema.index({ user: 1, createdAt: -1 });
taskActivitySchema.index({ type: 1, createdAt: -1 });

export default mongoose.model<ITaskActivity>(
  "TaskActivity",
  taskActivitySchema
);
