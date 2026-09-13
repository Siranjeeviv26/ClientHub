import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsMongoId,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ example: 'contract.pdf' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiPropertyOptional({ example: 'Signed client contract' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    enum: ['client', 'lead', 'deal', 'proposal', 'invoice', 'general'],
    default: 'general',
  })
  @IsOptional()
  @IsEnum(['client', 'lead', 'deal', 'proposal', 'invoice', 'general'])
  folder?: string;

  @ApiPropertyOptional({
    enum: ['client', 'lead', 'deal', 'proposal', 'invoice'],
  })
  @IsOptional()
  @IsEnum(['client', 'lead', 'deal', 'proposal', 'invoice'])
  relatedType?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsMongoId()
  relatedId?: string;

  @ApiPropertyOptional({ example: ['contract', 'signed', '2024'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class QueryDocumentsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'contract' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['client', 'lead', 'deal', 'proposal', 'invoice', 'general'],
  })
  @IsOptional()
  @IsEnum(['client', 'lead', 'deal', 'proposal', 'invoice', 'general'])
  folder?: string;

  @ApiPropertyOptional({
    enum: ['client', 'lead', 'deal', 'proposal', 'invoice'],
  })
  @IsOptional()
  @IsEnum(['client', 'lead', 'deal', 'proposal', 'invoice'])
  relatedType?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsMongoId()
  relatedId?: string;

  @ApiPropertyOptional({ example: 'createdAt:desc' })
  @IsOptional()
  @IsString()
  sort?: string;
}
