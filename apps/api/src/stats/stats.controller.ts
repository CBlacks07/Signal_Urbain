import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('dashboard')
  @Roles(Role.AGENT)
  getDashboard(@CurrentUser('role') role: Role, @CurrentUser('communeId') communeId: string) {
    // SUPER_ADMIN voit tout, les autres voient leur commune
    return this.stats.getDashboard(role === Role.SUPER_ADMIN ? undefined : communeId);
  }

  @Get('commune/:id')
  @Roles(Role.AGENT)
  getByCommune(@Param('id') id: string) {
    return this.stats.getByCommune(id);
  }
}
