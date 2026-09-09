import { IsEmail, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../roles/role-permissions.enum';

export class InviteMemberDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: Role, example: Role.SALES })
  @IsEnum(Role)
  role: Role;
}