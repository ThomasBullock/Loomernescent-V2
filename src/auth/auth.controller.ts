import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Render,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { LoginExceptionFilter } from './filters/auth-exception.filter';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { MailService } from '../mail/mail.service';

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  'password-confirm': string;
  stratosphere?: string;
}

interface ForgotBody {
  email: string;
  commandant?: string;
}

interface ResetBody {
  password: string;
  'password-confirm': string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  @Get('/login')
  @Render('login')
  getLogin() {
    return { title: 'Login' };
  }

  @UseGuards(LocalAuthGuard)
  @UseFilters(LoginExceptionFilter)
  @Post('/login')
  login(@Req() req: Request, @Res() res: Response) {
    req.session.save((err) => {
      if (err) return res.redirect('/auth/login');
      res.redirect('/');
    });
  }

  @Post('/logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.logout((err) => {
      if (err) throw err;
      req.session['flash'] = { success: ['You have been logged out'] };
      req.session.save(() => res.redirect('/auth/login'));
    });
  }

  @Get('/register')
  @Render('register')
  getRegister() {
    return { title: 'Sign up' };
  }

  @Post('/register')
  async register(
    @Body() body: RegisterBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (body.stratosphere) {
      throw new BadRequestException();
    }

    const errors: string[] = [];
    if (!body.name) errors.push('Name is required');
    if (!body.email?.includes('@')) errors.push('Valid email is required');
    if (!body.password || body.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (body.password !== body['password-confirm']) {
      errors.push('Passwords do not match');
    }

    if (errors.length) {
      return res.render('register', { title: 'Sign up', errors, body });
    }

    const user = await this.authService.register(
      body.name,
      body.email,
      body.password,
    );

    this.mailService
      .send({
        to: user.email,
        subject: 'Welcome to Loomernescent',
        template: 'welcome',
        context: { user },
      })
      .catch(() => {
        // welcome email failure should not block registration
      });

    req.login(user, (err) => {
      if (err) {
        req.session['flash'] = {
          success: ['Account created — please log in'],
        };
        return req.session.save(() => res.redirect('/auth/login'));
      }
      req.session['flash'] = {
        success: [`Welcome to Loomernescent, ${user.name}!`],
      };
      req.session.save(() => res.redirect('/'));
    });
  }

  @Post('/forgot')
  async forgot(
    @Body() body: ForgotBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (body.commandant) {
      throw new BadRequestException();
    }

    const user = await this.authService.findByEmail(body.email);

    // generic message regardless of whether the email exists (privacy)
    const flashAndRedirect = () => {
      req.session['flash'] = {
        success: [
          'If that email matches an account, a password reset link has been sent.',
        ],
      };
      req.session.save(() => res.redirect('/auth/login'));
    };

    if (!user) {
      return flashAndRedirect();
    }

    const token = await this.authService.setResetToken(user);
    const resetURL = `${req.protocol}://${req.get('host')}/auth/reset/${token}`;

    try {
      await this.mailService.send({
        to: user.email,
        subject: 'Password Reset',
        template: 'password-reset',
        context: { user, resetURL },
      });
    } catch {
      req.session['flash'] = {
        error: ['Could not send reset email. Please try again later.'],
      };
      return req.session.save(() => res.redirect('/auth/login'));
    }

    flashAndRedirect();
  }

  @Get('/reset/:token')
  async getReset(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = await this.authService.findByResetToken(token);
    if (!user) {
      req.session['flash'] = {
        error: ['Password reset link is invalid or has expired.'],
      };
      return req.session.save(() => res.redirect('/auth/login'));
    }
    return res.render('reset', { title: 'Reset your password' });
  }

  @Post('/reset/:token')
  async postReset(
    @Param('token') token: string,
    @Body() body: ResetBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = await this.authService.findByResetToken(token);
    if (!user) {
      req.session['flash'] = {
        error: ['Password reset link is invalid or has expired.'],
      };
      return req.session.save(() => res.redirect('/auth/login'));
    }

    const errors: string[] = [];
    if (!body.password || body.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (body.password !== body['password-confirm']) {
      errors.push('Passwords do not match');
    }

    if (errors.length) {
      return res.render('reset', {
        title: 'Reset your password',
        errors,
      });
    }

    const updated = await this.authService.resetPassword(user, body.password);

    req.login(updated, (err) => {
      if (err) {
        req.session['flash'] = {
          success: ['Password updated — please log in.'],
        };
        return req.session.save(() => res.redirect('/auth/login'));
      }
      req.session['flash'] = {
        success: ['Your password has been reset. You are now logged in.'],
      };
      req.session.save(() => res.redirect('/'));
    });
  }
}
