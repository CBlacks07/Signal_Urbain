import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IncidentsService, CreateIncidentDto, ListIncidentsDto, UpdateIncidentDto } from './incidents.service';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get()
  @Roles(Role.CITIZEN)
  @ApiOperation({ summary: 'Lister les incidents (filtrés, paginés)' })
  findAll(
    @CurrentUser() user: { communeId: string | null; role: Role },
    @Query() query: ListIncidentsDto,
  ) {
    // Agents et admins ne voient que les incidents de leur commune ;
    // seul le super-admin a une vue sur toutes les communes
    if ((user.role === Role.AGENT || user.role === Role.ADMIN) && user.communeId) {
      query.communeId = user.communeId;
    }
    return this.incidents.findAll(query);
  }

  @Post()
  @Roles(Role.CITIZEN)
  @ApiOperation({ summary: 'Créer un nouveau signalement' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateIncidentDto) {
    return this.incidents.create(userId, dto);
  }

  @Get(':id')
  @Roles(Role.CITIZEN)
  @ApiOperation({ summary: 'Détail d\'un incident' })
  findOne(@Param('id') id: string) {
    return this.incidents.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.AGENT)
  @ApiOperation({ summary: 'Modifier statut, priorité, assignation (AGENT+)' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('communeId') communeId: string | null,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidents.update(id, userId, role, communeId, dto);
  }

  @Post(':id/upvote')
  @Roles(Role.CITIZEN)
  upvote(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.incidents.upvote(id, userId);
  }

  @Delete(':id/upvote')
  @Roles(Role.CITIZEN)
  removeUpvote(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.incidents.removeUpvote(id, userId);
  }
}
