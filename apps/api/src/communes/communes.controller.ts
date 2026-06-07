import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CommunesService } from './communes.service';

@ApiTags('Communes')
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
