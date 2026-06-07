import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommentsService } from './comments.service';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents/:incidentId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @Roles(Role.CITIZEN)
  findAll(@Param('incidentId') incidentId: string, @CurrentUser('role') role: Role) {
    return this.comments.findByIncident(incidentId, role !== Role.CITIZEN);
  }

  @Post()
  @Roles(Role.CITIZEN)
  create(
    @Param('incidentId') incidentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { content: string; isInternal?: boolean },
  ) {
    const isInternal = body.isInternal && role !== Role.CITIZEN;
    return this.comments.create(incidentId, userId, body.content, isInternal);
  }
}
