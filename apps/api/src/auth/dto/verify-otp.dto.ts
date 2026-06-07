import { IsString, Length, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '+22890123456' })
  @IsString()
  @Matches(/^(\+228|00228)?\d{8}$/)
  phone: string;

  @ApiProperty({ example: '123456', description: 'Code OTP 6 chiffres' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiPropertyOptional({ example: 'Komi Agbeko', description: 'Requis pour la 1ère inscription' })
  @IsOptional()
  @IsString()
  name?: string;
}
