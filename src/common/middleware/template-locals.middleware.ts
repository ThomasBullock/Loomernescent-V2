import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as helpers from '../helpers/template-helpers';

@Injectable()
export class TemplateLocalsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.locals.h = helpers;
    res.locals.currentPath = req.path;
    res.locals.path = req.path;
    res.locals.user = null;
    res.locals.flashes = {};
    next();
  }
}
