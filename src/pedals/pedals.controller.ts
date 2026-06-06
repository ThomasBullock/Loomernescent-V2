import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PedalsService, CreatePedalInput } from './pedals.service';
import { Pedal } from '../entities/pedal.entity';
import { AdminGuard } from '../auth/guards/admin.guard';

interface PedalFormBody {
  brand?: string;
  name?: string;
  pedalType?: string;
  pedalType2?: string;
  yearsManufactured?: string;
  comments?: string;
  youtube?: string;
}

@Controller()
export class PedalsController {
  constructor(private readonly pedalsService: PedalsService) {}

  @Get('/pedals')
  @Render('pedals')
  async getPedals(@Query('page') page?: string) {
    const pageNum = parseInt(page || '1', 10) || 1;
    const result = await this.pedalsService.getPedals(pageNum);
    return { title: 'Pedals', ...result };
  }

  @Get('/pedals/page/:page')
  @Render('pedals')
  async getPedalsPaginated(@Param('page') page: string) {
    const pageNum = parseInt(page, 10) || 1;
    const result = await this.pedalsService.getPedals(pageNum);
    return { title: 'Pedals', ...result };
  }

  @Get('/pedals/new')
  @UseGuards(AdminGuard)
  @Render('addPedal')
  addForm() {
    return { title: 'Add Pedal', pedal: {} };
  }

  @Post('/pedals')
  @UseGuards(AdminGuard)
  async create(
    @Body() body: PedalFormBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const errors = validatePedalBody(body);
    if (errors.length) {
      return res.status(200).render('addPedal', {
        title: 'Add Pedal',
        errors,
        pedal: body,
      });
    }

    try {
      const pedal = await this.pedalsService.create(body as CreatePedalInput);
      req.session['flash'] = {
        success: [`${pedal.brand} ${pedal.name} added`],
      };
      req.session.save(() => res.redirect(`/pedal/${pedal.slug}`));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return res.status(200).render('addPedal', {
          title: 'Add Pedal',
          errors: ['A pedal with that brand and name already exists'],
          pedal: body,
        });
      }
      throw err;
    }
  }

  @Get('/pedals/:id/edit')
  @UseGuards(AdminGuard)
  @Render('editPedal')
  async editForm(@Param('id') id: string) {
    const pedal = await this.pedalsService.getPedalById(id);
    if (!pedal) throw new NotFoundException('Pedal not found');
    return {
      title: `Edit ${pedal.brand} ${pedal.name}`,
      pedal: pedalForForm(pedal),
    };
  }

  @Post('/pedals/:id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() body: PedalFormBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const existing = await this.pedalsService.getPedalById(id);
    if (!existing) throw new NotFoundException('Pedal not found');

    const errors = validatePedalBody(body);
    if (errors.length) {
      return res.status(200).render('editPedal', {
        title: `Edit ${existing.brand} ${existing.name}`,
        errors,
        pedal: { ...body, id },
      });
    }

    try {
      const pedal = await this.pedalsService.update(
        id,
        body as CreatePedalInput,
      );
      if (!pedal) throw new NotFoundException('Pedal not found');
      req.session['flash'] = {
        success: [`${pedal.brand} ${pedal.name} updated`],
      };
      req.session.save(() => res.redirect(`/pedal/${pedal.slug}`));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return res.status(200).render('editPedal', {
          title: `Edit ${existing.brand} ${existing.name}`,
          errors: ['A pedal with that brand and name already exists'],
          pedal: { ...body, id },
        });
      }
      throw err;
    }
  }

  @Post('/pedals/:id/delete')
  @UseGuards(AdminGuard)
  async destroy(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const existing = await this.pedalsService.getPedalById(id);
    if (!existing) throw new NotFoundException('Pedal not found');

    await this.pedalsService.delete(id);
    req.session['flash'] = {
      success: [`${existing.brand} ${existing.name} deleted`],
    };
    req.session.save(() => res.redirect('/pedals'));
  }

  @Get('/pedal/:slug')
  @Render('pedal')
  async getPedalBySlug(@Param('slug') slug: string) {
    const pedal = await this.pedalsService.getPedalBySlug(slug);
    if (!pedal) throw new NotFoundException('Pedal not found');
    return { title: `${pedal.brand} ${pedal.name}`, pedal };
  }
}

function pedalForForm(pedal: Pedal): Record<string, unknown> {
  return {
    ...pedal,
    yearsManufactured:
      pedal.yearsManufactured
        ?.map((d) => new Date(d).getUTCFullYear())
        .join(', ') ?? '',
  };
}

function validatePedalBody(body: PedalFormBody): string[] {
  const errors: string[] = [];
  if (!body.brand?.trim()) errors.push('Brand is required');
  if (!body.name?.trim()) errors.push('Pedal name is required');
  return errors;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; driverError?: { code?: string } };
  return e?.code === '23505' || e?.driverError?.code === '23505';
}
