import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Band } from "../entities/band.entity";

export interface TagCount {
  name: string;
  count: number;
}

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Band)
    private readonly bandRepo: Repository<Band>,
  ) {}

  /**
   * Returns all distinct tags across all bands, ordered by usage count descending.
   * PostgreSQL `unnest` is the equivalent of Mongo's `$unwind + $group`.
   */
  async getTagsList(): Promise<TagCount[]> {
    const rows: { name: string; count: string }[] = await this.bandRepo.query(
      `SELECT tag AS name, COUNT(*) AS count
       FROM bands, unnest(tags) AS tag
       GROUP BY tag
       ORDER BY count DESC`,
    );
    return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
  }

  /**
   * Returns bands that have at least one tag. When `tag` is supplied, only
   * bands carrying that specific tag are returned.
   */
  async getBandsByTag(tag?: string): Promise<Band[]> {
    const qb = this.bandRepo.createQueryBuilder("b");
    if (tag) {
      qb.where(":tag = ANY(b.tags)", { tag });
    } else {
      qb.where("array_length(b.tags, 1) > 0");
    }
    return qb.getMany();
  }
}
