import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: '+22890123456', description: 'Numéro togolais (+228XXXXXXXX)' })
  @IsString()
  @Matches(/^(\+228|00228)?\d{8}$/, { message: 'Numéro de téléphone togolais invalide' })
  phone: string;
}
