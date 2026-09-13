import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsObject,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationType } from '../schemas/communication.schema';

export class CreateCommunicationDto {
  @ApiProperty({ enum: CommunicationType, example: CommunicationType.EMAIL })
  @IsEnum(CommunicationType)
  type: CommunicationType;

  @ApiPropertyOptional({ enum: ['inbound', 'outbound'], example: 'outbound' })
  @IsOptional()
  @IsString()
  @IsEnum(['inbound', 'outbound'])
  direction?: string;

  @ApiPropertyOptional({ example: 'Q4 Contract Review' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ example: 'Discussed the contract terms with the client.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  @IsMongoId()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Lead ID' })
  @IsOptional()
  @IsMongoId()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Deal ID' })
  @IsOptional()
  @IsMongoId()
  dealId?: string;

  @ApiPropertyOptional({ type: [String], example: ['john@example.com', 'jane@example.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participants?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Document IDs' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ example: 1200, description: 'Duration in seconds' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ type: Object, example: { location: 'Conference Room A' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QueryCommunicationsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: CommunicationType })
  @IsOptional()
  type?: CommunicationType;

  @ApiPropertyOptional({ enum: ['inbound', 'outbound'] })
  @IsOptional()
  direction?: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Lead ID' })
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Deal ID' })
  @IsOptional()
  dealId?: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Search in subject and content' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'createdAt:desc' })
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ description: 'Start date ISO string' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date ISO string' })
  @IsOptional()
  endDate?: string;
}
