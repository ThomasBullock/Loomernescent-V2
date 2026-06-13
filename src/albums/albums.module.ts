import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Album } from "../entities/album.entity";
import { AlbumsController } from "./albums.controller";
import { AlbumsService } from "./albums.service";
import { ImagesModule } from "src/common/images/images.module";

@Module({
  imports: [TypeOrmModule.forFeature([Album]), ImagesModule], // Makes ImageKitService injectable in this module | NestJS, Runtime Dependency Injection
  controllers: [AlbumsController],
  providers: [AlbumsService],
})
export class AlbumsModule {}
