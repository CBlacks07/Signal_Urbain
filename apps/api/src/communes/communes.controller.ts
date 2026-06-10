import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CommunesService } from './communes.service';

// Le guard rend le décorateur @Public() effectif : la liste et le détail
// restent ouverts, mais /communes/:id/stats exige désormais une authentification.
@ApiTags('Communes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communes')
export class CommunesController {
  constructor(private readonly communes: CommunesService) {}

  @Get()
  @Public()
  findAll() {
    return this.communes.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.communes.findOne(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.communes.getStats(id);
  }
}
