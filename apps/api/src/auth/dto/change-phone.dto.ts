import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePhoneDto {
  @ApiProperty({ example: '+22890123456', description: 'Nouveau numéro togolais (+228XXXXXXXX)' })
  @IsString()
  @Matches(/^(\+228|00228)?\d{8}$/, { message: 'Numéro de téléphone togolais invalide' })
  newPhone: string;

  @ApiProperty({ example: '123456', description: 'Code OTP 6 chiffres reçu sur le nouveau numéro' })
  @IsString()
  @Length(6, 6)
  code: string;
}
