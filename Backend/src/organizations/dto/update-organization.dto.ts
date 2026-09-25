import { IsString, MinLength, MaxLength, Matches, IsOptional, IsObject, ValidateNested, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'MM/DD/YYYY' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  workingHours?: {
    start?: string;
    end?: string;
    days?: number[];
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  notifications?: {
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
    leadAssigned?: boolean;
    taskAssigned?: boolean;
    taskDueSoon?: boolean;
    dealUpdated?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  invoice?: {
    prefix?: string;
    nextNumber?: number;
    defaultTaxRate?: number;
    paymentTerms?: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  security?: {
    passwordMinLength?: number;
    requireUppercase?: boolean;
    requireNumbers?: boolean;
    sessionTimeout?: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  company?: {
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    logo?: string;
  };
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Acme Corporation' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'acme-corp' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  slug?: string;

  @ApiPropertyOptional({ example: 25, description: 'Maximum members allowed (product owner only)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxMembers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOrganizationSettingsDto)
  settings?: UpdateOrganizationSettingsDto;
}