import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Render,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/login')
  @Render('login')
  async getLogin() {
    return { title: 'Login' };
  }

  @Post('/login')
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { email, password } = body;
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid email or password',
        email: body.email, // preserve input
      });
    }

    req.login(user, (err) => {
      if (err) {
        return res.render('login', { title: 'Login', error: 'Login failed' });
      }
      res.redirect('/');
    });
  }

  //  if you want a paranoid-level logout that invalidates the session entirely
  // (so even the cookie becomes useless), you combine it with req.session.destroy():
  @Post('/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout((err) => {
      if (err) throw err;
      req.session['flash'] = { success: ['You have been logged out'] };
      res.redirect('/auth/login');
    });
  }

  @Get('/register')
  @Render('register')
  async getRegister() {
    return { title: 'Sign up' };
  }

  @Post('/register')
  async register(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      stratosphere: string;
    },
  ) {
    const errors: string[] = [];
    if (body.stratosphere) {
      throw new BadRequestException();
    }
    if (!body.name) {
      errors.push('Name is required');
    }
    if (!body.email?.includes('@')) {
      errors.push('Valid email is required');
    }
    if (!body.password || body.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (body.password !== body['password-confirm']) {
      errors.push('Passwords do not match');
    }

    if (errors.length) {
      return { title: 'Sign up', errors, body }; // re-render, no redirect
    }
    const { name, email, password } = body;
    const user = await this.authService.register(name, email, password);
    return { name: user.name };
  }
}
