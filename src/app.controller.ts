import { Controller, Get, Render } from "@nestjs/common";

@Controller()
export class AppController {
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
    };
  }
}
