import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedal } from '../entities/pedal.entity';

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
    return this.pedalRepo.findOne({
      where: { slug },
    });
  }
}
