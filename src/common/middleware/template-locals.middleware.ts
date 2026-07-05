import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as helpers from "../helpers/template-helpers";
import { ImageKitService, UrlTransforms } from "../images/image-kit.service";

@Injectable()
export class TemplateLocalsMiddleware implements NestMiddleware {
  constructor(private readonly imageKit: ImageKitService) {}

  use(req: Request, res: Response, next: NextFunction) {
    res.locals.h = helpers;
    res.locals.imageUrl = (path: string, transforms?: UrlTransforms): string =>
      this.imageKit.buildUrl(path, transforms);
    res.locals.currentPath = req.path;
    res.locals.path = req.path;
    res.locals.user = req.user ?? null;
    res.locals.flashes = req.session.flash ?? null;
    delete req.session.flash;
    next();
  }
}
