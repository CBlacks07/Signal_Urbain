import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ example: '+22890123456' })
  @IsString()
  @Matches(/^(\+228|00228)?\d{8}$/, { message: 'Numéro de téléphone togolais invalide' })
  phone: string;

  @ApiProperty({ example: 'Komi Agbeko' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'Voirie' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  service?: string;

  @ApiPropertyOptional({ description: 'Commune (super-admin uniquement)' })
  @IsOptional()
  @IsString()
  communeId?: string;
}
