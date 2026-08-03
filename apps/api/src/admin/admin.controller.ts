import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Priority, Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ─── Stats globales ───────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.admin.getGlobalStats();
  }

  // ─── Communes ─────────────────────────────────────────────────────────────

  @Get('communes')
  getCommunes() {
    return this.admin.findAllCommunes();
  }

  @Post('communes')
  createCommune(
    @CurrentUser('id') actorId: string,
    @Body() body: { name: string; prefecture: string; contactEmail?: string; contactPhone?: string },
  ) {
    return this.admin.createCommune(actorId, body);
  }

  @Patch('communes/:id')
  updateCommune(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; prefecture?: string; contactEmail?: string; contactPhone?: string },
  ) {
    return this.admin.updateCommune(actorId, id, body);
  }

  @Delete('communes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCommune(@CurrentUser('id') actorId: string, @Param('id') id: string) {
    return this.admin.deleteCommune(actorId, id);
  }

  // ─── Utilisateurs ─────────────────────────────────────────────────────────

  @Get('users')
  getUsers(@Query('role') role?: string) {
    return this.admin.findAllUsers(role);
  }

  @Patch('users/:id/role')
  updateRole(@CurrentUser('id') actorId: string, @Param('id') id: string, @Body() body: { role: Role }) {
    return this.admin.updateUserRole(actorId, id, body.role);
  }

  @Patch('users/:id/commune')
  updateCommuneOfUser(
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Body() body: { communeId: string | null },
  ) {
    return this.admin.updateUserCommune(actorId, id, body.communeId);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@CurrentUser('id') actorId: string, @Param('id') id: string) {
    return this.admin.deleteUser(actorId, id);
  }

  // ─── Règles de délai (SLA) ────────────────────────────────────────────────

  @Get('sla-rules')
  getSlaRules() {
    return this.admin.getSlaRules();
  }

  @Patch('sla-rules/:priority')
  updateSlaRule(
    @CurrentUser('id') actorId: string,
    @Param('priority') priority: Priority,
    @Body() body: { targetHours: number },
  ) {
    return this.admin.updateSlaRule(actorId, priority, body.targetHours);
  }

  @Get('sla-settings')
  getSlaSettings() {
    return this.admin.getSlaSettings();
  }

  @Patch('sla-settings')
  updateSlaSettings(
    @CurrentUser('id') actorId: string,
    @Body() body: { suspendOnThirdParty?: boolean; requireAfterPhoto?: boolean },
  ) {
    return this.admin.updateSlaSettings(actorId, body);
  }

  // ─── Journal d'audit ──────────────────────────────────────────────────────

  @Get('audit-log')
  getAuditLog(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.admin.getAuditLog(page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }
}
