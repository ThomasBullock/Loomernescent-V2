import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Render,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';
import { BandsService, CreateBandInput } from './bands.service';
import { User } from '../entities/user.entity';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ImageKitService } from '../common/images/image-kit.service';
import { processImage } from '../common/images/process-image';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const bandImageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new BadRequestException('Only image uploads are allowed'), false);
  },
};

interface BandFormBody {
  name?: string;
  description?: string;
  personnel?: string;
  pastPersonnel?: string;
  labels?: string;
  yearsActive?: string;
  tags?: string | string[];
  locationAddress?: string;
  locationLng?: string;
  locationLat?: string;
  youtubePl?: string;
  vimeoPl?: string;
}

@Controller()
export class BandsController {
  constructor(
    private readonly bandsService: BandsService,
    private readonly imageKit: ImageKitService,
  ) {}

  @Get('/')
  @Render('index')
  async homePage() {
    const hero = await this.bandsService.getHeroTiles();
    return { title: 'Home', hero };
  }

  @Get('/bands')
  @Render('bands')
  async getBands(@Query('page') page?: string) {
    const pageNum = parseInt(page || '1', 10) || 1;
    const result = await this.bandsService.getBands(pageNum);
    return { title: 'Bands', ...result };
  }

  @Get('/bands/page/:page')
  @Render('bands')
  async getBandsPaginated(@Param('page') page: string) {
    const pageNum = parseInt(page, 10) || 1;
    const result = await this.bandsService.getBands(pageNum);
    return { title: 'Bands', ...result };
  }

  @Get('/band/new')
  @UseGuards(AdminGuard)
  @Render('editBand')
  addForm() {
    return { title: 'Add Band', band: {} };
  }

  @Post('/bands')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image', bandImageMulterOptions))
  async create(
    @Body() body: BandFormBody,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const errors = validateBandBody(body);
    if (errors.length) {
      return res.status(200).render('editBand', {
        title: 'Add Band',
        errors,
        band: body,
      });
    }

    const image = file ? await this.uploadBandImage(file, body.name!) : {};
    const author = req.user as User;

    try {
      const band = await this.bandsService.create({
        ...(body as CreateBandInput),
        authorId: author.id,
        ...image,
      });
      req.session['flash'] = {
        success: [`${band.name} added`],
      };
      req.session.save(() => res.redirect(`/band/${band.slug}`));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return res.status(200).render('editBand', {
          title: 'Add Band',
          errors: ['A band with that name already exists'],
          band: body,
        });
      }
      throw err;
    }
  }

  @Get('/band/:slug')
  @Render('band')
  async getBandBySlug(@Param('slug') slug: string) {
    const { band, albums } = await this.bandsService.getBandBySlug(slug);
    if (!band) throw new NotFoundException('Band not found');
    return { title: band.name, band, albums };
  }

  private async uploadBandImage(
    file: Express.Multer.File,
    name: string,
  ): Promise<{ imageFileId: string; imagePath: string }> {
    const processed = await processImage(file.buffer, {
      maxDimension: 2000,
      aspectRatio: { w: 1, h: 1 },
      format: 'jpeg',
      quality: 85,
    });
    const { fileId, filePath } = await this.imageKit.upload({
      buffer: processed.buffer,
      filenameHint: name,
      folder: 'bands',
    });
    return { imageFileId: fileId, imagePath: filePath };
  }
}

function validateBandBody(body: BandFormBody): string[] {
  const errors: string[] = [];
  if (!body.name?.trim()) errors.push('Band name is required');
  return errors;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; driverError?: { code?: string } };
  return e?.code === '23505' || e?.driverError?.code === '23505';
}
