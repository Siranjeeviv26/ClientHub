import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventStatus } from '../schemas/event.schema';

@ValidatorConstraint({ name: 'EndTimeAfterStartTime', async: false })
export class EndTimeAfterStartTimeConstraint implements ValidatorConstraintInterface {
  validate(endTime: string, args: any) {
    const obj = args.object as any;
    if (!obj.startTime || !endTime) return true;
    return new Date(endTime) > new Date(obj.startTime);
  }

  defaultMessage() {
    return 'endTime must be after startTime';
  }
}

export class EventReminderDto {
  @ApiProperty({ example: 'email' })
  @IsString()
  type: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  minutesBefore: number;
}

export class EventRecurrenceDto {
  @ApiProperty({ example: 'weekly' })
  @IsString()
  frequency: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  interval: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateEventDto {
  @ApiProperty({ example: 'Q4 Strategy Review' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Review quarterly goals and pipeline status' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: EventType, default: EventType.OTHER })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiProperty({ example: '2026-09-15T10:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-09-15T11:00:00.000Z' })
  @IsDateString()
  @Validate(EndTimeAfterStartTimeConstraint)
  endTime: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ example: 'Conference Room A' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439013' })
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional({ example: ['507f1f77bcf86cd799439014', '507f1f77bcf86cd799439015'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participants?: string[];

  @ApiPropertyOptional({ type: [EventReminderDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventReminderDto)
  reminders?: EventReminderDto[];

  @ApiPropertyOptional({ type: EventRecurrenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventRecurrenceDto)
  recurrence?: EventRecurrenceDto;
}
