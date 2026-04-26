import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (req.isAuthenticated()) {
      return true;
    }

    req.session['flash'] = {
      error: ['You must be logged in to access that page'],
    };
    req.session.save(() => res.redirect('/auth/login'));
    return false;
  }
}
