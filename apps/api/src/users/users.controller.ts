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
    @Body() body: { name?: string; role?: Role; service?: string },
  ) {
    return this.users.updateAgent(id, body);
  }

  @Delete('agents/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAgent(@Param('id') id: string) {
    return this.users.removeAgent(id);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.users.findById(id);
  }
}
