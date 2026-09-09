import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDate,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage } from '../schemas/deal.schema';

export class CreateDealDto {
  @ApiProperty({ example: 'Enterprise License - Acme Corp' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 50000, minimum: 0 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ enum: DealStage, default: DealStage.NEW })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @ApiPropertyOptional({ example: 25, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  expectedCloseDate?: Date;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ example: ['enterprise', 'annual'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'Decision maker is CTO' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'quarterly', 'yearly', 'one_time'], default: 'one_time' })
  @IsOptional()
  @IsEnum(['monthly', 'quarterly', 'yearly', 'one_time'])
  recurringType?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRecurringValue?: number;
}