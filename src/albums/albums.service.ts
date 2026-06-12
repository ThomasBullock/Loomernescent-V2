import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Album } from "../entities/album.entity";

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

  async getAlbumBySlug(slug: string): Promise<Album | null> {
    return this.albumRepo.findOne({
      where: { slug },
      relations: ["band"],
    });
  }
}
