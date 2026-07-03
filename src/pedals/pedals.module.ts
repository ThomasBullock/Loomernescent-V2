import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Pedal } from "../entities/pedal.entity";
import { PedalsController } from "./pedals.controller";
import { PedalsService } from "./pedals.service";
import { ImagesModule } from "../common/images/images.module";
import { Band } from "../entities/band.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Pedal, Band]), ImagesModule],
  controllers: [PedalsController],
  providers: [PedalsService],
})
export class PedalsModule {}
