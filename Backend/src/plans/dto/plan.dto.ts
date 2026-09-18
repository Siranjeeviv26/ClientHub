import { IsString, MinLength, MaxLength, Matches, IsOptional, IsNumber, Min, IsArray, IsBoolean, IsInt, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Professional' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'professional' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  slug?: string;

  @ApiPropertyOptional({ example: 'For growing sales organizations.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 79, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: '/mo' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  period?: string;

  @ApiPropertyOptional({ example: 50, description: 'Member quota applied to subscribed organizations' })
  @IsOptional()
  @IsInt()
  @Min(1)
  memberLimit?: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum workspaces an organization on this plan can own' })
  @IsOptional()
  @IsInt()
  @Min(1)
  workspaceLimit?: number;

  @ApiPropertyOptional({ example: 500, description: 'Maximum clients allowed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  clientLimit?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum leads allowed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadLimit?: number;

  @ApiPropertyOptional({ example: 200, description: 'Maximum deals allowed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  dealLimit?: number;

  @ApiPropertyOptional({ example: 5368709120, description: 'Storage limit in bytes (5GB default)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  storageLimit?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Monthly email send limit' })
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyEmailLimit?: number;

  @ApiPropertyOptional({ example: ['5 workspaces', 'Up to 50 members'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ example: ['ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE'], description: 'Roles that organizations on this plan can assign' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional({ example: { MANAGER: ['reports:read', 'reports:export'], SALES: ['deals:read'] }, description: 'Additional permissions per role beyond the base set' })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Professional' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 'professional' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 79, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: '/mo' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  period?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  memberLimit?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  workspaceLimit?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  clientLimit?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadLimit?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dealLimit?: number;

  @ApiPropertyOptional({ example: 5368709120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  storageLimit?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyEmailLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Roles that organizations on this plan can assign' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional({ description: 'Additional permissions per role beyond the base set' })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
