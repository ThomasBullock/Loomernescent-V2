import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Band } from '../entities/band.entity';
import { Album } from '../entities/album.entity';

@Injectable()
export class BandsService {
  constructor(
    @InjectRepository(Band)
    private readonly bandRepo: Repository<Band>,
    @InjectRepository(Album)
    private readonly albumRepo: Repository<Album>,
  ) {}

  async getHeroTiles(): Promise<any[]> {
    const bands = await this.bandRepo.find({
      select: ['id', 'name', 'slug', 'photoSquareSm'],
    });
    const albums = await this.albumRepo.find({
      select: ['id', 'title', 'slug', 'cover'],
    });

    const bandTiles = bands.map((b) => ({
      type: 'band',
      name: b.name,
      slug: b.slug,
      img: b.photoSquareSm || 'band.jpg',
    }));
    const albumTiles = albums.map((a) => ({
      type: 'album',
      name: a.title,
      slug: a.slug,
      img: `covers/${a.cover || 'band.jpg'}`,
    }));

    const all = [...bandTiles, ...albumTiles];
    // Shuffle and take up to 24
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, 24);
  }

  async getBands(
    page: number = 1,
    perPage: number = 6,
  ): Promise<{ bands: Band[]; page: number; pages: number; count: number }> {
    const [bands, count] = await this.bandRepo.findAndCount({
      order: { created: 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });
    const pages = Math.ceil(count / perPage) || 1;
    return { bands, page, pages, count };
  }

  async getBandBySlug(
    slug: string,
  ): Promise<{ band: Band | null; albums: Album[] }> {
    const band = await this.bandRepo.findOne({
      where: { slug },
      relations: ['author'],
    });
    const albums = band
      ? await this.albumRepo.find({
          where: { bandId: band.id },
          order: { releaseDate: 'DESC' },
        })
      : [];
    return { band, albums };
  }
}
