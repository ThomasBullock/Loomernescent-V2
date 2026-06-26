import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Favourite } from "../entities/favourite.entity";
import type { Band } from "../entities/band.entity";
import type { Album } from "../entities/album.entity";
import type { Pedal } from "../entities/pedal.entity";

export interface GetFavouritesResult {
  bands: Band[];
  albums: Album[];
  pedals: Pedal[];
}

/** Toggle a band, album or pedal favourite for a user and query favourites page data. */
@Injectable()
export class FavouritesService {
  constructor(
    @InjectRepository(Favourite)
    private readonly repo: Repository<Favourite>,
  ) {}

  async toggleBand(userId: string, bandId: string): Promise<void> {
    const existing = await this.repo.findOneBy({ userId, bandId });
    if (existing) {
      await this.repo.delete(existing.id);
    } else {
      await this.repo.save(this.repo.create({ userId, bandId }));
    }
  }

  async toggleAlbum(userId: string, albumId: string): Promise<void> {
    const existing = await this.repo.findOneBy({ userId, albumId });
    if (existing) {
      await this.repo.delete(existing.id);
    } else {
      await this.repo.save(this.repo.create({ userId, albumId }));
    }
  }

  async togglePedal(userId: string, pedalId: string): Promise<void> {
    const existing = await this.repo.findOneBy({ userId, pedalId });
    if (existing) {
      await this.repo.delete(existing.id);
    } else {
      await this.repo.save(this.repo.create({ userId, pedalId }));
    }
  }

  async getFavourites(userId: string): Promise<GetFavouritesResult> {
    const favs = await this.repo.find({
      where: { userId },
      relations: ["band", "album", "pedal"],
    });
    return {
      bands: favs.filter((f) => f.band != null).map((f) => f.band),
      albums: favs.filter((f) => f.album != null).map((f) => f.album),
      pedals: favs.filter((f) => f.pedal != null).map((f) => f.pedal),
    };
  }
}
