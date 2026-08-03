import { Body, Controller, Post, UseInterceptors, UploadedFile, UseGuards, ParseFilePipeBuilder, HttpStatus, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('photo')
  @Roles(Role.CITIZEN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPhoto(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('communeId') communeId: string | null,
    @Body('incidentId') incidentId: string,
    @Body('kind') kind: 'AVANT' | 'APRES' | undefined,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpe?g|png|webp|heic|heif)$/ })
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY, fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    if (!incidentId) throw new BadRequestException('incidentId requis');
    return this.uploads.uploadPhoto(userId, role, communeId, incidentId, file, kind ?? 'AVANT');
  }
}
