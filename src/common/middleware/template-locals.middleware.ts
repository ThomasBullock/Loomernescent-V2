import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as helpers from '../helpers/template-helpers';

@Injectable()
export class TemplateLocalsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('[locals]', {
      cookie: req.headers.cookie,
      sessionId: req.sessionID,
      sessionPassport: (req.session as any)?.passport,
      reqUser: req.user,
    });
    res.locals.h = helpers;
    res.locals.currentPath = req.path;
    res.locals.path = req.path;
    res.locals.user = req.user ?? null;
    res.locals.flashes = req.session['flash'] ?? null;
    delete req.session['flash'];
    next();
  }
}
