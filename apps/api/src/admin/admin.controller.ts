import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
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
  createCommune(@Body() body: { name: string; prefecture: string; contactEmail?: string; contactPhone?: string }) {
    return this.admin.createCommune(body);
  }

  @Patch('communes/:id')
  updateCommune(
    @Param('id') id: string,
    @Body() body: { name?: string; prefecture?: string; contactEmail?: string; contactPhone?: string },
  ) {
    return this.admin.updateCommune(id, body);
  }

  @Delete('communes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCommune(@Param('id') id: string) {
    return this.admin.deleteCommune(id);
  }

  // ─── Utilisateurs ─────────────────────────────────────────────────────────

  @Get('users')
  getUsers(@Query('role') role?: string) {
    return this.admin.findAllUsers(role);
  }

  @Patch('users/:id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: Role }) {
    return this.admin.updateUserRole(id, body.role);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }
}
