import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import slugify from 'slugify';
import { Pedal } from '../entities/pedal.entity';

export interface CreatePedalInput {
  brand: string;
  name: string;
  pedalType?: string;
  pedalType2?: string;
  yearsManufactured?: string;
  comments?: string;
  youtube?: string;
}

@Injectable()
export class PedalsService {
  constructor(
    @InjectRepository(Pedal)
    private readonly pedalRepo: Repository<Pedal>,
  ) {}

  async getPedals(
    page: number = 1,
    perPage: number = 6,
  ): Promise<{ pedals: Pedal[]; page: number; pages: number; count: number }> {
    const [pedals, count] = await this.pedalRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });
    const pages = Math.ceil(count / perPage) || 1;
    return { pedals, page, pages, count };
  }

  async getPedalBySlug(slug: string): Promise<Pedal | null> {
    return this.pedalRepo.findOne({ where: { slug } });
  }

  async getPedalById(id: string): Promise<Pedal | null> {
    try {
      return await this.pedalRepo.findOne({ where: { id } });
    } catch {
      return null;
    }
  }

  async update(id: string, input: CreatePedalInput): Promise<Pedal | null> {
    const pedal = await this.getPedalById(id);
    if (!pedal) return null;

    const slugChanged =
      input.brand !== pedal.brand || input.name !== pedal.name;

    pedal.brand = input.brand;
    pedal.name = input.name;
    if (slugChanged) {
      pedal.slug = slugify(`${input.brand}-${input.name}`, {
        lower: true,
        strict: true,
      });
    }
    pedal.pedalType = (input.pedalType || null) as string;
    pedal.pedalType2 = (
      input.pedalType2 && input.pedalType2 !== 'None' ? input.pedalType2 : null
    ) as string;
    pedal.yearsManufactured = parseYears(input.yearsManufactured);
    pedal.comments = (input.comments || null) as string;
    pedal.youtube = (input.youtube || null) as string;

    return this.pedalRepo.save(pedal);
  }

  async create(input: CreatePedalInput): Promise<Pedal> {
    const slug = slugify(`${input.brand}-${input.name}`, {
      lower: true,
      strict: true,
    });
    const data: Partial<Pedal> = {
      brand: input.brand,
      name: input.name,
      slug,
      pedalType: input.pedalType || undefined,
      pedalType2:
        input.pedalType2 && input.pedalType2 !== 'None'
          ? input.pedalType2
          : undefined,
      yearsManufactured: parseYears(input.yearsManufactured),
      comments: input.comments || undefined,
      youtube: input.youtube || undefined,
    };
    return this.pedalRepo.save(data as Pedal);
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.pedalRepo.delete(id);
      return (result.affected ?? 0) > 0;
    } catch {
      return false;
    }
  }
}

function parseYears(csv?: string): Date[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => new Date(s));
}
