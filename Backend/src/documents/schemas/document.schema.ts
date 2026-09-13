import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type DocumentDocument = Documents & Document;

@Schema({ timestamps: true, collection: 'documents' })
export class Documents extends BaseDocument {
  @Prop({ required: true, trim: true })
  fileName: string;

  @Prop({ required: true })
  fileType: string;

  @Prop({ required: true, type: Number })
  fileSize: number;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ required: true })
  cloudinaryPublicId: string;

  @Prop({
    type: String,
    enum: ['client', 'lead', 'deal', 'proposal', 'invoice', 'general'],
    default: 'general',
    index: true,
  })
  folder: string;

  @Prop({
    type: String,
    enum: ['client', 'lead', 'deal', 'proposal', 'invoice'],
  })
  relatedType?: string;

  @Prop({ type: Types.ObjectId, index: true })
  relatedId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uploadedBy: Types.ObjectId;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const DocumentsSchema = SchemaFactory.createForClass(Documents);

DocumentsSchema.index({ organizationId: 1, folder: 1 });
DocumentsSchema.index({ organizationId: 1, relatedType: 1, relatedId: 1 });
DocumentsSchema.index({ organizationId: 1, uploadedBy: 1 });
DocumentsSchema.index({ organizationId: 1, createdAt: -1 });
DocumentsSchema.index({ organizationId: 1, fileName: 'text' });
