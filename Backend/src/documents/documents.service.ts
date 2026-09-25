import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Express } from 'express';

import { Documents, DocumentDocument } from './schemas/document.schema';
import { CreateDocumentDto, QueryDocumentsDto } from './dto/create-document.dto';
import { StorageService } from '../storage/storage.service';
import { UsageService } from '../usage/usage.service';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(Documents.name)
    private readonly documentModel: Model<DocumentDocument>,
    private readonly storageService: StorageService,
    private readonly usageService: UsageService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    dto: CreateDocumentDto,
  ): Promise<DocumentDocument> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Enforce the plan's storageLimit before touching Cloudinary.
    // Recompute actual usage from stored docs so pre-existing files count.
    const agg = await this.documentModel.aggregate([
      { $match: { organizationId: new Types.ObjectId(organizationId) } },
      { $group: { _id: null, total: { $sum: '$fileSize' } } },
    ]).exec();
    const actualUsed = agg[0]?.total || 0;
    await this.usageService.syncStorageUsage(organizationId, actualUsed);
    const check = await this.usageService.checkLimit(organizationId, 'storage');
    if (check.limit !== -1 && actualUsed + file.size > check.limit) {
      throw new ForbiddenException(
        `Storage limit exceeded for your plan (${formatBytes(actualUsed)} used of ${formatBytes(check.limit)}). Delete files or upgrade your plan.`,
      );
    }

    const uploadResult = await this.storageService.upload(file, {
      folder: 'clienthub/documents',
      resourceType: 'auto',
    });

    const document = await this.documentModel.create({
      organizationId: new Types.ObjectId(organizationId),
      uploadedBy: new Types.ObjectId(userId),
      fileName: dto.fileName || file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      fileUrl: uploadResult.url,
      cloudinaryPublicId: uploadResult.publicId,
      folder: dto.folder || 'general',
      relatedType: dto.relatedType,
      relatedId: dto.relatedId ? new Types.ObjectId(dto.relatedId) : undefined,
      description: dto.description,
      tags: dto.tags || [],
    });

    this.logger.log(`Document created: ${document.fileName} (${document._id})`);
    await this.usageService.incrementUsage(organizationId, 'storage', file.size);
    return document;
  }

  async findAll(
    organizationId: string,
    query: QueryDocumentsDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      organizationId: new Types.ObjectId(organizationId),
    };

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [
        { fileName: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } },
      ];
    }

    if (query.folder) {
      filter.folder = query.folder;
    }

    if (query.relatedType) {
      filter.relatedType = query.relatedType;
    }

    if (query.relatedId) {
      filter.relatedId = new Types.ObjectId(query.relatedId);
    }

    let sort: any = { createdAt: -1 };
    if (query.sort) {
      const [field, dir] = query.sort.split(':');
      const allowedSortKeys = new Set(['createdAt', 'fileName', 'fileSize', 'fileType', 'folder', 'updatedAt']);
      if (allowedSortKeys.has(field)) {
        sort = { [field]: dir === 'asc' ? 1 : -1 };
      }
    }

    const [documents, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .populate('uploadedBy', 'firstName lastName email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter),
    ]);

    return {
      items: documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(
    organizationId: string,
    id: string,
  ): Promise<DocumentDocument> {
    const document = await this.documentModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('uploadedBy', 'firstName lastName email avatar');

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async remove(
    organizationId: string,
    id: string,
  ): Promise<void> {
    const document = await this.findOne(organizationId, id);

    if (document.cloudinaryPublicId) {
      try {
        const isImage = document.fileType?.startsWith('image/');
        await this.storageService.delete(
          document.cloudinaryPublicId,
          isImage ? 'image' : 'raw',
        );
      } catch (error) {
        this.logger.warn(`Failed to delete Cloudinary file: ${error.message}`);
      }
    }

    await document.deleteOne();
    await this.usageService.decrementUsage(organizationId, 'storage', document.fileSize || 0);
    this.logger.log(`Document deleted: ${document.fileName}`);
  }

  async findByEntity(
    organizationId: string,
    relatedType: string,
    relatedId: string,
  ): Promise<DocumentDocument[]> {
    return this.documentModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        relatedType,
        relatedId: new Types.ObjectId(relatedId),
      })
      .populate('uploadedBy', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }
}
