import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Album } from "../entities/album.entity";
import { AlbumsController } from "./albums.controller";
import { AlbumsService } from "./albums.service";
import { ImagesModule } from "../common/images/images.module";
import { Band } from "../entities";

@Module({
  // Makes ImageKitService injectable in this module | NestJS, Runtime Dependency Injection
  imports: [TypeOrmModule.forFeature([Album, Band]), ImagesModule],
  controllers: [AlbumsController],
  providers: [AlbumsService],
})
export class AlbumsModule {}
