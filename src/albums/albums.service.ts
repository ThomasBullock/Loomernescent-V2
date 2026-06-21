import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { Album } from "../entities/album.entity";
import slugify from "slugify";

export interface CreateAlbumInput {
  title?: string;
  artist?: string;
  bandId: string;
  producer?: string;
  mixedBy?: string;
  engineer?: string;
  tracks?: string;
  releaseDate?: string;
  label?: string;
  spotifyUrl?: string;
  bandcampUrl?: string;
  imageFileId?: string;
  imagePath?: string;
  comments?: string;
}

export interface UpdateAlbumInput {
  title?: string;
  artist?: string;
  bandId?: string;
  producer?: string;
  mixedBy?: string;
  engineer?: string;
  tracks?: string;
  releaseDate?: string;
  label?: string;
  spotifyUrl?: string;
  bandcampUrl?: string;
  imageFileId?: string;
  imagePath?: string;
  comments?: string;
}

@Injectable()
export class AlbumsService {
  constructor(
    @InjectRepository(Album)
    private readonly albumRepo: Repository<Album>,
  ) {}

  async getAlbums(
    page: number = 1,
    perPage: number = 12,
  ): Promise<{ albums: Album[]; page: number; pages: number; count: number }> {
    const [albums, count] = await this.albumRepo.findAndCount({
      order: { createdAt: "DESC" },
      skip: (page - 1) * perPage,
      take: perPage,
    });
    const pages = Math.ceil(count / perPage) || 1;
    return { albums, page, pages, count };
  }

  async getAlbumById(id: string): Promise<Album | null> {
    try {
      return await this.albumRepo.findOne({ where: { id } });
    } catch {
      return null;
    }
  }

  async getAlbumBySlug(slug: string): Promise<Album | null> {
    return this.albumRepo.findOne({
      where: { slug },
      relations: ["band"],
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.albumRepo.delete(id);
      return (result.affected ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async create(input: CreateAlbumInput): Promise<Album> {
    const baseSlug = slugify(`${input.title}`, {
      lower: true,
      strict: true,
    });
    const albumsWithSlug = await this.albumRepo.find({
      where: { slug: ILike(`${baseSlug}%`) },
      select: ["slug"],
    });

    const existingSlugs = new Set(albumsWithSlug.map((a) => a.slug));
    let slug = baseSlug;
    let suffix = 1;

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const album = this.albumRepo.create({
      title: input.title,
      slug,
      releaseDate: input.releaseDate ? new Date(input.releaseDate) : undefined,
      artist: input.artist,
      bandId: input.bandId,
      imageFileId: input.imageFileId,
      imagePath: input.imagePath,
      producer: parseList(input.producer),
      engineer: parseList(input.engineer),
      mixedBy: parseList(input.mixedBy),
      label: input.label,
      tracks: parseList(input.tracks),
      spotifyUrl: input.spotifyUrl,
      bandcampUrl: input.bandcampUrl,
      comments: input.comments,
    });
    return this.albumRepo.save(album);
  }

  /**
   * Updates an existing album. Slug is recomputed only when the title changes.
   * bandId is updated only when explicitly supplied (i.e. when the artist changed
   * and the controller has already resolved the new band).
   * Image columns are preserved when no new value is supplied.
   */
  async update(id: string, input: UpdateAlbumInput): Promise<Album | null> {
    const album = await this.getAlbumById(id);
    if (!album) {
      return null;
    }

    if (input.title && input.title !== album.title) {
      const baseSlug = slugify(input.title, { lower: true, strict: true });
      const existing = await this.albumRepo.find({
        where: { slug: ILike(`${baseSlug}%`) },
        select: ["slug"],
      });
      const existingSlugs = new Set(
        existing.filter((a) => a.slug !== album.slug).map((a) => a.slug),
      );
      let slug = baseSlug;
      let suffix = 1;
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }
      album.title = input.title;
      album.slug = slug;
    }

    if (input.artist !== undefined) {
      album.artist = input.artist;
    }
    if (input.bandId !== undefined) {
      album.bandId = input.bandId;
    }

    album.producer = parseList(input.producer);
    album.engineer = parseList(input.engineer);
    album.mixedBy = parseList(input.mixedBy);
    album.tracks = parseList(input.tracks);
    album.releaseDate = (input.releaseDate ? new Date(input.releaseDate) : null) as Date;
    album.label = (input.label || null) as string;
    album.spotifyUrl = (input.spotifyUrl || null) as string;
    album.bandcampUrl = (input.bandcampUrl || null) as string;
    album.comments = (input.comments || null) as string;

    if (input.imageFileId !== undefined) {
      album.imageFileId = input.imageFileId;
    }
    if (input.imagePath !== undefined) {
      album.imagePath = input.imagePath;
    }

    return this.albumRepo.save(album);
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
