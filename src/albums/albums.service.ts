import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { Album } from "../entities/album.entity";
import slugify from "slugify";
import { Band } from "../entities/band.entity";

export interface CreateAlbumInput {
  title?: string;
  artist?: string;
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

export type UpdateAlbumInput = CreateAlbumInput;

@Injectable()
export class AlbumsService {
  constructor(
    @InjectRepository(Album)
    private readonly albumRepo: Repository<Album>,
    @InjectRepository(Band)
    private readonly bandRepo: Repository<Band>,
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
    /* Slug */
    const baseSlug = slugify(`${input.title}`, {
      lower: true,
      strict: true,
    });
    // 1. Find all slugs that start with the base slug
    // Example: If base is "my-album", this finds "my-album", "my-album-1", "my-album-photo", etc.
    const albumsWithSlug = await this.albumRepo.find({
      where: { slug: ILike(`${baseSlug}%`) },
      select: ["slug"], // Performance optimization: only select the slug column
    });

    // 2. Put existing slugs into a Set for O(1) lookups
    const existingSlugs = new Set(albumsWithSlug.map((a) => a.slug));
    let slug = baseSlug;
    let suffix = 1;

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    /* Artist */
    const band = await this.bandRepo.findOne({
      where: { name: input.artist },
    });
    if (!band) {
      throw new Error("Artist not found");
    }

    const album = this.albumRepo.create({
      title: input.title,
      slug,
      releaseDate: input.releaseDate ? new Date(input.releaseDate) : undefined,
      artist: input.artist,
      bandId: band.id,
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
   * Band is re-resolved only when the artist name changes.
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

    if (input.artist && input.artist !== album.artist) {
      const band = await this.bandRepo.findOne({ where: { name: input.artist } });
      if (!band) {
        throw new Error("Artist not found");
      }
      album.artist = input.artist;
      album.bandId = band.id;
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
