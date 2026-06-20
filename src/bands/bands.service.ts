import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import slugify from "slugify";
import { Band } from "../entities/band.entity";
import { Album } from "../entities/album.entity";

export interface GalleryImage {
  fileId: string;
  filePath: string;
}

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
  spotifyId?: string;
  spotifyUrl?: string;
  authorId: string;
  imageFileId?: string | null;
  imagePath?: string | null;
  gallery?: GalleryImage[];
}

export type UpdateBandInput = Omit<CreateBandInput, "authorId">;

export interface HeroTile {
  type: "band" | "album";
  name: string;
  slug: string;
  imagePath: string | null;
  cover: string | null;
}

export interface BandMapItem {
  name: string;
  slug: string;
  locationLat: number;
  locationLng: number;
  locationAddress: string | null;
  imagePath: string | null;
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
      spotifyId: input.spotifyId || undefined,
      spotifyUrl: input.spotifyUrl || undefined,
      authorId: input.authorId,
      imageFileId: input.imageFileId ?? undefined,
      imagePath: input.imagePath ?? undefined,
      gallery: input.gallery ?? [],
    });
    return this.bandRepo.save(band);
  }

  async getBandById(id: string): Promise<Band | null> {
    try {
      return await this.bandRepo.findOne({ where: { id } });
    } catch {
      return null;
    }
  }

  /**
   * Updates an existing band. Slug is recomputed only when the name changes.
   * Image columns are preserved when no new value is supplied; a supplied
   * gallery is appended to the existing one (no removal in this step).
   */
  async update(id: string, input: UpdateBandInput): Promise<Band | null> {
    const band = await this.getBandById(id);
    if (!band) {
      return null;
    }

    if (input.name !== band.name) {
      band.name = input.name;
      band.slug = slugify(input.name, { lower: true, strict: true });
    }
    band.description = (input.description || null) as string;
    band.labels = parseList(input.labels);
    band.personnel = parseList(input.personnel);
    band.pastPersonnel = parseList(input.pastPersonnel);
    band.tags = normalizeTags(input.tags);
    band.yearsActive = parseYears(input.yearsActive);
    band.locationAddress = (input.locationAddress || null) as string;
    band.locationLng = (parseCoord(input.locationLng) ?? null) as number;
    band.locationLat = (parseCoord(input.locationLat) ?? null) as number;
    band.youtubePl = (input.youtubePl || null) as string;
    band.vimeoPl = (input.vimeoPl || null) as string;
    if (input.spotifyId !== undefined) {
      band.spotifyId = input.spotifyId;
    }
    if (input.spotifyUrl !== undefined) {
      band.spotifyUrl = input.spotifyUrl;
    }
    // Only touch the square image when a new value is supplied; an edit
    // without a file upload must preserve the existing image.
    if (input.imageFileId !== undefined) {
      band.imageFileId = input.imageFileId;
    }
    if (input.imagePath !== undefined) {
      band.imagePath = input.imagePath;
    }
    if (input.gallery?.length) {
      band.gallery = [...band.gallery, ...input.gallery];
    }

    return this.bandRepo.save(band);
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.bandRepo.delete(id);
      return (result.affected ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async getHeroTiles(): Promise<HeroTile[]> {
    const bands = await this.bandRepo.find({
      select: ["id", "name", "slug", "imagePath"],
    });
    const albums = await this.albumRepo.find({
      select: ["id", "title", "slug", "imagePath"],
    });

    const bandTiles: HeroTile[] = bands.map((b) => ({
      type: "band",
      name: b.name,
      slug: b.slug,
      imagePath: b.imagePath,
      cover: null,
    }));
    const albumTiles: HeroTile[] = albums.map((a) => ({
      type: "album",
      name: a.title,
      slug: a.slug,
      imagePath: null,
      cover: a.imagePath || null,
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
      order: { created: "DESC" },
      skip: (page - 1) * perPage,
      take: perPage,
    });
    const pages = Math.ceil(count / perPage) || 1;
    return { bands, page, pages, count };
  }

  /**
   * Returns all bands with known coordinates, projected to the minimal fields
   * needed for map markers.
   */
  async getBandsForMap(location_lng?: string, location_lat?: string): Promise<BandMapItem[]> {
    const qb = this.bandRepo
      .createQueryBuilder("b")
      .select([
        "b.name",
        "b.slug",
        "b.locationLat",
        "b.locationLng",
        "b.locationAddress",
        "b.imagePath",
      ])
      .where("b.locationLat IS NOT NULL AND b.locationLng IS NOT NULL");

    if (location_lng && location_lat) {
      qb.andWhere(
        `(6371 * acos(LEAST(1.0,
            cos(radians(:lat)) * cos(radians(b.locationLat)) *
            cos(radians(b.locationLng) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(b.locationLat))
          ))) <= :radius`,
        { lat: parseFloat(location_lat), lng: parseFloat(location_lng), radius: 50 },
      );
    }

    return qb.getMany() as Promise<BandMapItem[]>;
  }

  async getBandBySlug(slug: string): Promise<{ band: Band | null; albums: Album[] }> {
    const band = await this.bandRepo.findOne({
      where: { slug },
      relations: ["author"],
    });
    const albums = band
      ? await this.albumRepo.find({
          where: { bandId: band.id },
          order: { releaseDate: "DESC" },
        })
      : [];
    return { band, albums };
  }
}

function parseList(csv?: string): string[] {
  if (!csv) {
    return [];
  }
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseYears(csv?: string): Date[] {
  return parseList(csv).map((s) => new Date(s));
}

function normalizeTags(tags?: string | string[]): string[] {
  if (!tags) {
    return [];
  }
  return Array.isArray(tags) ? tags : [tags];
}

function parseCoord(value?: string): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const num = parseFloat(value);
  return Number.isNaN(num) ? undefined : num;
}
