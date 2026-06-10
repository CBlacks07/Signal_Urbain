import { IsOptional, IsString, IsEmail, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Champs que l'utilisateur a le droit de modifier sur son propre profil.
 * Tout autre champ (role, isVerified, isActive, points…) est volontairement absent :
 * la ValidationPipe globale (whitelist + forbidNonWhitelisted) rejette les champs en trop,
 * ce qui empêche toute élévation de privilèges via PATCH /users/me.
 */
export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Komi Agbeko' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'komi@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional({ description: 'Identifiant de la commune souhaitée' })
  @IsOptional()
  @IsString()
  communeId?: string;

  @ApiPropertyOptional({ description: 'Token de push Expo/FCM' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fcmToken?: string;

  @ApiPropertyOptional({ description: "URL de l'avatar" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
