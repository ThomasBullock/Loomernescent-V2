import {
  Controller,
  Get,
  Param,
  Query,
  Render,
  NotFoundException,
} from '@nestjs/common';
import { AlbumsService } from './albums.service';

@Controller()
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get('/albums')
  @Render('albums')
  async getAlbums(@Query('page') page?: string) {
    const pageNum = parseInt(page || '1', 10) || 1;
    const result = await this.albumsService.getAlbums(pageNum);
    return { title: 'Albums', ...result };
  }

  @Get('/albums/page/:page')
  @Render('albums')
  async getAlbumsPaginated(@Param('page') page: string) {
    const pageNum = parseInt(page, 10) || 1;
    const result = await this.albumsService.getAlbums(pageNum);
    return { title: 'Albums', ...result };
  }

  @Get('/album/:slug')
  @Render('album')
  async getAlbumBySlug(@Param('slug') slug: string) {
    const album = await this.albumsService.getAlbumBySlug(slug);
    if (!album) throw new NotFoundException('Album not found');
    return { title: album.title, album, band: album.band };
  }
}
