import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type TaskDocument = Task & Document;

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true, collection: 'tasks' })
export class Task extends BaseDocument {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.TODO, index: true })
  status: TaskStatus;

  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM, index: true })
  priority: TaskPriority;

  @Prop({ type: Date, index: true })
  dueDate?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Client' })
  clientId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lead' })
  leadId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal' })
  dealId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags: string[];

  get isOverdue(): boolean {
    if (!this.dueDate || this.status === TaskStatus.COMPLETED || this.status === TaskStatus.CANCELLED) {
      return false;
    }
    return new Date() > this.dueDate;
  }

  get daysUntilDue(): number | null {
    if (!this.dueDate) return null;
    const diff = this.dueDate.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

export const TaskSchema = SchemaFactory.createForClass(Task);

TaskSchema.index({ organizationId: 1, status: 1 });
TaskSchema.index({ organizationId: 1, assignedTo: 1 });
TaskSchema.index({ organizationId: 1, priority: 1 });
TaskSchema.index({ organizationId: 1, dueDate: 1 });
TaskSchema.index({ organizationId: 1, clientId: 1 });
TaskSchema.index({ organizationId: 1, leadId: 1 });
TaskSchema.index({ organizationId: 1, dealId: 1 });
TaskSchema.index({ organizationId: 1, createdAt: -1 });