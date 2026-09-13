import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Express } from 'express';

import { Documents, DocumentDocument } from './schemas/document.schema';
import { CreateDocumentDto, QueryDocumentsDto } from './dto/create-document.dto';
import { StorageService } from '../storage/storage.service';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(Documents.name)
    private readonly documentModel: Model<DocumentDocument>,
    private readonly storageService: StorageService,
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
      const sortParts = query.sort.split(':');
      sort = { [sortParts[0]]: sortParts[1] === 'asc' ? 1 : -1 };
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
