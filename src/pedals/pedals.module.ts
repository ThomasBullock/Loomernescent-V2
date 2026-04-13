import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedal } from '../entities/pedal.entity';
import { PedalsController } from './pedals.controller';
import { PedalsService } from './pedals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pedal])],
  controllers: [PedalsController],
  providers: [PedalsService],
})
export class PedalsModule {}
