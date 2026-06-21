import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Album } from "../entities/album.entity";
import { AlbumsController } from "./albums.controller";
import { AlbumsService } from "./albums.service";
import { ImagesModule } from "../common/images/images.module";
import { BandsModule } from "../bands/bands.module";

@Module({
  imports: [TypeOrmModule.forFeature([Album]), ImagesModule, BandsModule],
  controllers: [AlbumsController],
  providers: [AlbumsService],
})
export class AlbumsModule {}
