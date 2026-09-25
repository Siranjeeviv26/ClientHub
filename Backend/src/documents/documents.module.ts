import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Documents, DocumentsSchema } from './schemas/document.schema';
import { StorageModule } from '../storage/storage.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Documents.name, schema: DocumentsSchema },
    ]),
    StorageModule,
    UsageModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
