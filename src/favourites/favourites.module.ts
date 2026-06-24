import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Favourite } from "../entities/favourite.entity";
import { FavouritesController } from "./favourites.controller";
import { FavouritesService } from "./favourites.service";

@Module({
  imports: [TypeOrmModule.forFeature([Favourite])],
  controllers: [FavouritesController],
  providers: [FavouritesService],
})
export class FavouritesModule {}
