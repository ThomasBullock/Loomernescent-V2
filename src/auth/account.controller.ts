import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { User } from '../entities/user.entity';

interface AccountUpdateBody {
  name: string;
  email: string;
}

@Controller('account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly authService: AuthService) {}

  @Get('/')
  getAccount(@Req() req: Request, @Res() res: Response) {
    return res.render('account', {
      title: 'Edit Your Account',
      user: req.user,
    });
  }

  @Post('/')
  async updateAccount(
    @Body() body: AccountUpdateBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const errors: string[] = [];
    if (!body.name) errors.push('Name is required');
    if (!body.email?.includes('@')) errors.push('Valid email is required');

    if (errors.length) {
      return res.render('account', {
        title: 'Edit Your Account',
        user: { ...(req.user as User), ...body },
        errors,
      });
    }

    try {
      await this.authService.updateProfile(req.user as User, {
        name: body.name,
        email: body.email,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not update account';
      return res.render('account', {
        title: 'Edit Your Account',
        user: { ...(req.user as User), ...body },
        errors: [message],
      });
    }

    req.session['flash'] = {
      success: ['Account updated'],
    };
    req.session.save(() => res.redirect('/account'));
  }
}
