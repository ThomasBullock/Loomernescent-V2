import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Band } from "../entities/band.entity";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";

@Module({
  imports: [TypeOrmModule.forFeature([Band])],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
