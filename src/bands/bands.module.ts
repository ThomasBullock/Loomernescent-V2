import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Band } from '../entities/band.entity';
import { Album } from '../entities/album.entity';
import { BandsController } from './bands.controller';
import { BandsService } from './bands.service';
import { ImagesModule } from '../common/images/images.module';

@Module({
  imports: [TypeOrmModule.forFeature([Band, Album]), ImagesModule],
  controllers: [BandsController],
  providers: [BandsService],
})
export class BandsModule {}
