import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import slugify from 'slugify';
import { Band } from '../entities/band.entity';
import { Album } from '../entities/album.entity';

export interface CreateBandInput {
  name: string;
  description?: string;
  personnel?: string;
  pastPersonnel?: string;
  labels?: string;
  yearsActive?: string;
  tags?: string | string[];
  locationAddress?: string;
  locationLng?: string;
  locationLat?: string;
  youtubePl?: string;
  vimeoPl?: string;
  authorId: string;
  imageFileId?: string | null;
  imagePath?: string | null;
}

@Injectable()
export class BandsService {
  constructor(
    @InjectRepository(Band)
    private readonly bandRepo: Repository<Band>,
    @InjectRepository(Album)
    private readonly albumRepo: Repository<Album>,
  ) {}

  async create(input: CreateBandInput): Promise<Band> {
    const slug = slugify(input.name, { lower: true, strict: true });
    const band = this.bandRepo.create({
      name: input.name,
      slug,
      description: input.description || undefined,
      labels: parseList(input.labels),
      personnel: parseList(input.personnel),
      pastPersonnel: parseList(input.pastPersonnel),
      tags: normalizeTags(input.tags),
      yearsActive: parseYears(input.yearsActive),
      locationAddress: input.locationAddress || undefined,
      locationLng: parseCoord(input.locationLng),
      locationLat: parseCoord(input.locationLat),
      youtubePl: input.youtubePl || undefined,
      vimeoPl: input.vimeoPl || undefined,
      authorId: input.authorId,
      imageFileId: input.imageFileId ?? undefined,
      imagePath: input.imagePath ?? undefined,
    });
    return this.bandRepo.save(band);
  }

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

function parseList(csv?: string): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseYears(csv?: string): Date[] {
  return parseList(csv).map((s) => new Date(s));
}

function normalizeTags(tags?: string | string[]): string[] {
  if (!tags) return [];
  return Array.isArray(tags) ? tags : [tags];
}

function parseCoord(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const num = parseFloat(value);
  return Number.isNaN(num) ? undefined : num;
}
