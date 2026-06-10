import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Le lampadaire est toujours éteint depuis 3 jours.' })
  @IsString()
  @IsNotEmpty({ message: 'Le commentaire ne peut pas être vide' })
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({ description: 'Note interne (agents/admins uniquement)' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
