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
  spotifyURL?: string;
  bandCampURL?: string;
  imageFileId?: string;
  imagePath?: string;
  comments?: string;
}

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

  async getAlbumBySlug(slug: string): Promise<Album | null> {
    return this.albumRepo.findOne({
      where: { slug },
      relations: ["band"],
    });
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
      spotifyUrl: input.spotifyURL,
      bandcampUrl: input.bandCampURL,
      comments: input.comments,
    });
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
