import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteOrganizationDto {
  @ApiProperty({ description: 'Current user password (step-up re-authentication)' })
  @IsString()
  @MinLength(1)
  password: string;
}
