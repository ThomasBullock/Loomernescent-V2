import {
  Controller,
  Get,
  Param,
  Query,
  Render,
  NotFoundException,
} from '@nestjs/common';
import { BandsService } from './bands.service';

@Controller()
export class BandsController {
  constructor(private readonly bandsService: BandsService) {}

  @Get('/')
  @Render('index')
  async homePage() {
    const hero = await this.bandsService.getHeroTiles();
    return { title: 'Home', hero };
  }

  @Get('/bands')
  @Render('bands')
  async getBands(@Query('page') page?: string) {
    const pageNum = parseInt(page || '1', 10) || 1;
    const result = await this.bandsService.getBands(pageNum);
    return { title: 'Bands', ...result };
  }

  @Get('/bands/page/:page')
  @Render('bands')
  async getBandsPaginated(@Param('page') page: string) {
    const pageNum = parseInt(page, 10) || 1;
    const result = await this.bandsService.getBands(pageNum);
    return { title: 'Bands', ...result };
  }

  @Get('/band/:slug')
  @Render('band')
  async getBandBySlug(@Param('slug') slug: string) {
    const { band, albums } = await this.bandsService.getBandBySlug(slug);
    if (!band) throw new NotFoundException('Band not found');
    return { title: band.name, band, albums };
  }
}
