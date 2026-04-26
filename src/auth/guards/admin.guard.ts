import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { User } from '../../entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (!req.isAuthenticated()) {
      req.session['flash'] = {
        error: ['You must be logged in to access that page'],
      };
      req.session.save(() => res.redirect('/auth/login'));
      return false;
    }

    const user = req.user as User | undefined;
    if (!user?.admin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
