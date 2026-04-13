import {
  Controller,
  Get,
  Param,
  Query,
  Render,
  NotFoundException,
} from '@nestjs/common';
import { PedalsService } from './pedals.service';

@Controller()
export class PedalsController {
  constructor(private readonly pedalsService: PedalsService) {}

  @Get('/pedals')
  @Render('pedals')
  async getPedals(@Query('page') page?: string) {
    const pageNum = parseInt(page || '1', 10) || 1;
    const result = await this.pedalsService.getPedals(pageNum);
    return { title: 'Pedals', ...result };
  }

  @Get('/pedals/page/:page')
  @Render('pedals')
  async getPedalsPaginated(@Param('page') page: string) {
    const pageNum = parseInt(page, 10) || 1;
    const result = await this.pedalsService.getPedals(pageNum);
    return { title: 'Pedals', ...result };
  }

  @Get('/pedal/:slug')
  @Render('pedal')
  async getPedalBySlug(@Param('slug') slug: string) {
    const pedal = await this.pedalsService.getPedalBySlug(slug);
    if (!pedal) throw new NotFoundException('Pedal not found');
    return { title: `${pedal.brand} ${pedal.name}`, pedal };
  }
}
