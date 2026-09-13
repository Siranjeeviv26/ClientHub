import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Express } from 'express';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto, QueryDocumentsDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/csv',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Permissions('documents:create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `File type "${file.mimetype}" is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        fileName: { type: 'string', example: 'contract.pdf' },
        description: { type: 'string', example: 'Signed client contract' },
        folder: {
          type: 'string',
          enum: ['client', 'lead', 'deal', 'proposal', 'invoice', 'general'],
          default: 'general',
        },
        relatedType: {
          type: 'string',
          enum: ['client', 'lead', 'deal', 'proposal', 'invoice'],
        },
        relatedId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        tags: { type: 'string', example: 'contract,signed' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or no file provided' })
  async upload(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileName') fileName?: string,
    @Body('description') description?: string,
    @Body('folder') folder?: string,
    @Body('relatedType') relatedType?: string,
    @Body('relatedId') relatedId?: string,
    @Body('tags') tags?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const dto: CreateDocumentDto = {
      fileName: fileName || file.originalname,
      description,
      folder: folder as any,
      relatedType: relatedType as any,
      relatedId,
      tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
    };

    const document = await this.documentsService.create(
      organizationId,
      userId,
      file,
      dto,
    );

    return { success: true, data: document };
  }

  @Get()
  @Permissions('documents:read')
  @ApiOperation({ summary: 'Get all documents with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'folder', required: false })
  @ApiQuery({ name: 'relatedType', required: false })
  @ApiQuery({ name: 'relatedId', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of documents' })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryDocumentsDto,
  ) {
    const result = await this.documentsService.findAll(organizationId, query);
    return { success: true, data: result };
  }

  @Get('entity/:type/:entityId')
  @Permissions('documents:read')
  @ApiOperation({ summary: 'Get documents for a specific entity (client, lead, deal, etc.)' })
  @ApiQuery({ name: 'type', required: true, enum: ['client', 'lead', 'deal', 'proposal', 'invoice'] })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiResponse({ status: 200, description: 'Documents linked to the entity' })
  async findByEntity(
    @CurrentOrg() organizationId: string,
    @Param('type') type: string,
    @Param('entityId') entityId: string,
  ) {
    const documents = await this.documentsService.findByEntity(
      organizationId,
      type,
      entityId,
    );
    return { success: true, data: documents };
  }

  @Get(':id')
  @Permissions('documents:read')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    const document = await this.documentsService.findOne(organizationId, id);
    return { success: true, data: document };
  }

  @Get('download/:id')
  @Permissions('documents:read')
  @ApiOperation({ summary: 'Download a document' })
  @ApiResponse({ status: 200, description: 'Document download URL' })
  async getDownloadUrl(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    const document = await this.documentsService.findOne(organizationId, id);
    return { success: true, data: { url: document.fileUrl, fileName: document.fileName } };
  }

  @Delete(':id')
  @Permissions('documents:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.documentsService.remove(organizationId, id);
    return { success: true, data: null };
  }
}
