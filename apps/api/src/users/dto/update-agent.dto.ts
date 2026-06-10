import { IsString, IsOptional, MaxLength, IsBoolean, IsEnum, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UpdateAgentDto {
  @ApiPropertyOptional({ example: 'Komi Agbeko' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: '+22890123456' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+228|00228)?\d{8}$/, { message: 'Numéro de téléphone togolais invalide' })
  phone?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 'Voirie' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  service?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
