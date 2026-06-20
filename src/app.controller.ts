import { Controller, Get, Render } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService) {}

  @Get("add")
  @Render("add")
  add() {
    return {
      title: "Add",
    };
  }

  @Get("favourites")
  @Render("favourites")
  favourites() {
    return {
      title: "My Favourites",
      bands: [],
      albums: [],
      pedals: [],
    };
  }

  // TODO tags

  @Get("map")
  @Render("map")
  map() {
    return {
      title: "Map of Shoegaze bands",
      mapKey: this.config.get<string>("GOOGLE_MAPS_KEY") ?? "",
      mapId: this.config.get<string>("GOOGLE_MAP_ID") ?? "DEMO_MAP_ID",
      ikUrl: this.config.get<string>("IMAGEKIT_URL_ENDPOINT") ?? "",
    };
  }
}
