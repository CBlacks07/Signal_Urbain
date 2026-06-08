import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.users.findMe(userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() body: { name?: string; email?: string; communeId?: string; fcmToken?: string },
  ) {
    return this.users.update(userId, body);
  }

  // ─── Gestion agents (ADMIN+) ──────────────────────────────────────────────

  @Get('agents')
  @Roles(Role.ADMIN)
  getAgents(@CurrentUser('communeId') communeId: string) {
    return this.users.findAgents(communeId);
  }

  @Get('citizens')
  @Roles(Role.ADMIN)
  getCitizens(@CurrentUser('communeId') communeId: string) {
    return this.users.findCitizens(communeId);
  }

  @Post('agents')
  @Roles(Role.ADMIN)
  createAgent(
    @CurrentUser('communeId') communeId: string,
    @Body() body: { phone: string; name: string; service?: string },
  ) {
    return this.users.createAgent({ ...body, communeId });
  }

  @Patch('agents/:id')
  @Roles(Role.ADMIN)
  updateAgent(
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; role?: Role; service?: string; communeId?: string; isActive?: boolean },
  ) {
    return this.users.updateAgent(id, body);
  }

  @Post('agents/:id/reassign')
  @Roles(Role.ADMIN)
  reassignIncidents(
    @Param('id') id: string,
    @Body() body: { toAgentId: string },
  ) {
    return this.users.reassignIncidents(id, body.toAgentId);
  }

  @Delete('agents/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAgent(@Param('id') id: string) {
    return this.users.removeAgent(id);
  }

  // ─── Demandes de changement de commune (AGENT+) ──────────────────────────

  @Get('commune-requests')
  @Roles(Role.AGENT)
  getCommuneRequests(@CurrentUser('communeId') communeId: string) {
    return this.users.findCommuneRequests(communeId);
  }

  @Patch('commune-requests/:id')
  @Roles(Role.AGENT)
  reviewCommuneRequest(
    @Param('id') id: string,
    @CurrentUser() reviewer: { id: string; communeId: string },
    @Body() body: { action: 'APPROVE' | 'REJECT'; note?: string },
  ) {
    return this.users.reviewCommuneRequest(id, reviewer, body.action, body.note);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.users.findById(id);
  }
}
