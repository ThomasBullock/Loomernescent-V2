import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch(UnauthorizedException)
export class LoginExceptionFilter implements ExceptionFilter {
  catch(_exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    req.session['flash'] = { error: ['Invalid email or password'] };
    req.session.save(() => res.redirect('/auth/login'));
  }
}
