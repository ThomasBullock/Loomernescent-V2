import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedal } from '../entities/pedal.entity';
import { PedalsController } from './pedals.controller';
import { PedalsService } from './pedals.service';
import { ImagesModule } from '../common/images/images.module';

@Module({
  imports: [TypeOrmModule.forFeature([Pedal]), ImagesModule],
  controllers: [PedalsController],
  providers: [PedalsService],
})
export class PedalsModule {}
