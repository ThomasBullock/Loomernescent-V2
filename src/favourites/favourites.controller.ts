import { Controller, Get, Param, Post, Render, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { FavouritesService } from "./favourites.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import type { User } from "../entities/user.entity";

@Controller()
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get("/favourites")
  @UseGuards(AuthGuard)
  @Render("favourites")
  async getFavourites(@Req() req: Request) {
    const user = req.user as User;
    const { bands, albums, pedals } = await this.favouritesService.getFavourites(user.id);
    return { title: "My Favourites", bands, albums, pedals };
  }

  @Post("/api/v1/bands/:id/loves")
  @UseGuards(AuthGuard)
  async toggleBand(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    await this.favouritesService.toggleBand(user.id, id);
    const referer = req.headers.referer ?? "/bands";
    res.redirect(referer);
  }

  @Post("/api/v1/albums/:id/loves")
  @UseGuards(AuthGuard)
  async toggleAlbum(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    await this.favouritesService.toggleAlbum(user.id, id);
    const referer = req.headers.referer ?? "/albums";
    res.redirect(referer);
  }

  @Post("/api/v1/pedals/:id/loves")
  @UseGuards(AuthGuard)
  async togglePedal(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    await this.favouritesService.togglePedal(user.id, id);
    const referer = req.headers.referer ?? "/pedals";
    res.redirect(referer);
  }
}
