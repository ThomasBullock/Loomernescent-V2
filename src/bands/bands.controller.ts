import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Render,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request, Response } from "express";
import { BandsService, CreateBandInput, GalleryImage, UpdateBandInput } from "./bands.service";
import { Band } from "../entities/band.entity";
import { User } from "../entities/user.entity";
import { AdminGuard } from "../auth/guards/admin.guard";
import { ImageKitService } from "../common/images/image-kit.service";
import { processImage } from "../common/images/process-image";
import { SpotifyService } from "../spotify/spotify.service";
import { BAND_IMAGE_OPTS, MAX_GALLERY_FILES, MAX_UPLOAD_BYTES } from "src/common/constants/image";

const bandImageFields = [
  { name: "image", maxCount: 1 },
  { name: "gallery", maxCount: MAX_GALLERY_FILES },
];

interface BandUploadFiles {
  image?: Express.Multer.File[];
  gallery?: Express.Multer.File[];
}

const bandImageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new BadRequestException("Only image uploads are allowed"), false);
    }
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
  spotifyId?: string;
  spotifyUrl?: string;
}

@Controller()
export class BandsController {
  private readonly logger = new Logger(BandsController.name);

  constructor(
    private readonly bandsService: BandsService,
    private readonly imageKit: ImageKitService,
    private readonly spotify: SpotifyService,
  ) {}

  @Get("/")
  @Render("index")
  async homePage() {
    const hero = await this.bandsService.getHeroTiles();
    return { title: "Home", hero };
  }

  @Get("/bands")
  @Render("bands")
  async getBands(@Query("page") page?: string) {
    const pageNum = parseInt(page || "1", 10) || 1;
    const result = await this.bandsService.getBands(pageNum);
    return { title: "Bands", ...result };
  }

  @Get("/bands/page/:page")
  @Render("bands")
  async getBandsPaginated(@Param("page") page: string) {
    const pageNum = parseInt(page, 10) || 1;
    const result = await this.bandsService.getBands(pageNum);
    return { title: "Bands", ...result };
  }

  @Get("/band/new")
  @UseGuards(AdminGuard)
  @Render("editBand")
  addForm() {
    return { title: "Add Band", band: {} };
  }

  @Post("/bands")
  @UseGuards(AdminGuard)
  @UseInterceptors(FileFieldsInterceptor(bandImageFields, bandImageMulterOptions))
  async create(
    @Body() body: BandFormBody,
    @UploadedFiles() files: BandUploadFiles | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const errors = validateBandBody(body);
    if (errors.length) {
      return res.status(200).render("editBand", {
        title: "Add Band",
        errors,
        band: body,
      });
    }

    const image = await this.uploadSquare(files?.image?.[0], body.name!);
    const gallery = await this.uploadGallery(files?.gallery, body.name!);
    const author = req.user as User;

    const spotifyData = await this.resolveSpotifyForCreate(body);

    try {
      const band = await this.bandsService.create({
        ...(body as CreateBandInput),
        ...spotifyData,
        authorId: author.id,
        ...image,
        gallery,
      });
      req.session["flash"] = {
        success: [`${band.name} added`],
      };
      req.session.save(() => res.redirect(`/band/${band.slug}`));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return res.status(200).render("editBand", {
          title: "Add Band",
          errors: ["A band with that name already exists"],
          band: body,
        });
      }
      throw err;
    }
  }

  @Get("/bands/:id/edit")
  @UseGuards(AdminGuard)
  @Render("editBand")
  async editForm(@Param("id") id: string) {
    const band = await this.bandsService.getBandById(id);
    if (!band) {
      throw new NotFoundException("Band not found");
    }
    return { title: `Edit ${band.name}`, band: bandForForm(band) };
  }

  @Post("/bands/:id")
  @UseGuards(AdminGuard)
  @UseInterceptors(FileFieldsInterceptor(bandImageFields, bandImageMulterOptions))
  async update(
    @Param("id") id: string,
    @Body() body: BandFormBody,
    @UploadedFiles() files: BandUploadFiles | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const existing = await this.bandsService.getBandById(id);
    if (!existing) {
      throw new NotFoundException("Band not found");
    }

    const errors = validateBandBody(body);
    if (errors.length) {
      return res.status(200).render("editBand", {
        title: `Edit ${existing.name}`,
        errors,
        band: { ...body, id },
      });
    }

    const oldFileId = existing.imageFileId;
    const image = await this.uploadSquare(files?.image?.[0], body.name!);
    const gallery = await this.uploadGallery(files?.gallery, body.name!);

    const spotifyData = await this.resolveSpotifyForUpdate(body, existing);

    try {
      const band = await this.bandsService.update(id, {
        ...(body as UpdateBandInput),
        ...spotifyData,
        ...image,
        gallery,
      });
      if (!band) {
        throw new NotFoundException("Band not found");
      }
      if (files?.image?.[0] && oldFileId) {
        void this.deleteImage(oldFileId);
      }
      req.session["flash"] = {
        success: [`${band.name} updated`],
      };
      req.session.save(() => res.redirect(`/band/${band.slug}`));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return res.status(200).render("editBand", {
          title: `Edit ${existing.name}`,
          errors: ["A band with that name already exists"],
          band: { ...body, id },
        });
      }
      throw err;
    }
  }

  @Post("/bands/:id/delete")
  @UseGuards(AdminGuard)
  async destroy(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    const existing = await this.bandsService.getBandById(id);
    if (!existing) {
      throw new NotFoundException("Band not found");
    }

    await this.bandsService.delete(id);
    const fileIds = [existing.imageFileId, ...existing.gallery.map((g) => g.fileId)].filter(
      (fid): fid is string => Boolean(fid),
    );
    for (const fileId of fileIds) {
      void this.deleteImage(fileId);
    }
    req.session["flash"] = {
      success: [`${existing.name} deleted`],
    };
    req.session.save(() => res.redirect("/bands"));
  }

  @Get("/band/:slug")
  @Render("band")
  async getBandBySlug(@Param("slug") slug: string) {
    const { band, albums } = await this.bandsService.getBandBySlug(slug);
    if (!band) {
      throw new NotFoundException("Band not found");
    }
    return { title: band.name, band, albums };
  }

  private async resolveSpotifyForCreate(
    body: BandFormBody,
  ): Promise<{ spotifyId?: string; spotifyUrl?: string }> {
    const manualId = body.spotifyId?.trim();
    const manualUrl = body.spotifyUrl?.trim();
    if (manualId && manualUrl) {
      return { spotifyId: manualId, spotifyUrl: manualUrl };
    }

    if (!body.name?.trim()) {
      return {};
    }
    const result = await this.spotify.searchArtist(body.name.trim());
    return result ?? {};
  }

  private async resolveSpotifyForUpdate(
    body: BandFormBody,
    existing: Band,
  ): Promise<{ spotifyId?: string; spotifyUrl?: string }> {
    const manualId = body.spotifyId?.trim();
    const manualUrl = body.spotifyUrl?.trim();
    if (manualId && manualUrl) {
      return { spotifyId: manualId, spotifyUrl: manualUrl };
    }

    if (existing.spotifyId) {
      return { spotifyId: existing.spotifyId, spotifyUrl: existing.spotifyUrl };
    }

    const name = body.name?.trim() || existing.name;
    const result = await this.spotify.searchArtist(name);
    return result ?? {};
  }

  private async uploadSquare(
    file: Express.Multer.File | undefined,
    name: string,
  ): Promise<Pick<CreateBandInput, "imageFileId" | "imagePath"> | object> {
    if (!file) {
      return {};
    }
    const processed = await processImage(file.buffer, {
      ...BAND_IMAGE_OPTS,
      aspectRatio: { w: 1, h: 1 },
    });
    const { fileId, filePath } = await this.imageKit.upload({
      buffer: processed.buffer,
      filenameHint: name,
      folder: "bands",
    });
    return { imageFileId: fileId, imagePath: filePath };
  }

  private async uploadGallery(
    files: Express.Multer.File[] | undefined,
    name: string,
  ): Promise<GalleryImage[]> {
    if (!files?.length) {
      return [];
    }
    return Promise.all(
      files.map(async (file) => {
        const processed = await processImage(file.buffer, BAND_IMAGE_OPTS);
        const { fileId, filePath } = await this.imageKit.upload({
          buffer: processed.buffer,
          filenameHint: `${name}-gallery`,
          folder: "bands",
        });
        return { fileId, filePath };
      }),
    );
  }

  // Best-effort cleanup; an orphaned ImageKit asset must never fail the request.
  private async deleteImage(fileId: string): Promise<void> {
    try {
      await this.imageKit.delete(fileId);
    } catch (err) {
      this.logger.error(`Failed to delete ImageKit file ${fileId}`, err);
    }
  }
}

function bandForForm(band: Band): Record<string, unknown> {
  return {
    ...band,
    personnel: band.personnel.join(", "),
    pastPersonnel: band.pastPersonnel.join(", "),
    labels: band.labels.join(", "),
    yearsActive: band.yearsActive.map((d) => new Date(d).getUTCFullYear()).join(", "),
  };
}

function validateBandBody(body: BandFormBody): string[] {
  const errors: string[] = [];
  if (!body.name?.trim()) {
    errors.push("Band name is required");
  }
  return errors;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; driverError?: { code?: string } };
  return e?.code === "23505" || e?.driverError?.code === "23505";
}
