import {
  Controller,
  Get,
  Logger,
  Param,
  Query,
  Render,
  NotFoundException,
  Post,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  UploadedFile,
  BadRequestException,
  Body,
} from "@nestjs/common";
import { AlbumsService, CreateAlbumInput, UpdateAlbumInput } from "./albums.service";
import { Album } from "../entities/album.entity";
import { AdminGuard } from "../auth/guards/admin.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { processImage } from "../common/images/process-image";
import { ImageKitService } from "../common/images/image-kit.service";
import { memoryStorage } from "multer";
import { MAX_UPLOAD_BYTES } from "../common/constants/image";
import type { Request, Response } from "express";

const albumImageMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (
    _req: Express.Request,
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

interface AlbumFormBody {
  title?: string;
  artist?: string;
  producer?: string;
  mixedBy?: string;
  engineer?: string;
  tracks?: string;
  releaseDate?: string;
  label?: string;
  spotifyUrl?: string;
  bandcampUrl?: string;
  comments?: string;
}

@Controller()
export class AlbumsController {
  private readonly logger = new Logger(AlbumsController.name);

  constructor(
    private readonly albumsService: AlbumsService,
    private readonly imageKit: ImageKitService,
  ) {}

  @Get("/albums")
  @Render("albums")
  async getAlbums(@Query("page") page?: string) {
    const pageNum = parseInt(page || "1", 10) || 1;
    const result = await this.albumsService.getAlbums(pageNum);
    return { title: "Albums", ...result };
  }

  @Get("/albums/page/:page")
  @Render("albums")
  async getAlbumsPaginated(@Param("page") page: string) {
    const pageNum = parseInt(page, 10) || 1;
    const result = await this.albumsService.getAlbums(pageNum);
    return { title: "Albums", ...result };
  }

  @Get("/album/new")
  @UseGuards(AdminGuard)
  @Render("editAlbum")
  addForm() {
    return { title: "Add Album", album: {} };
  }

  @Get("/album/:slug")
  @Render("album")
  async getAlbumBySlug(@Param("slug") slug: string) {
    const album = await this.albumsService.getAlbumBySlug(slug);
    if (!album) {
      throw new NotFoundException("Album not found");
    }
    return { title: album.title, album, band: album.band };
  }

  @Post("/albums")
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor("cover", albumImageMulterOptions))
  async create(
    @Body() body: AlbumFormBody,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const errors = validateAlbumBody(body);
    if (errors.length) {
      return res.status(200).render("editAlbum", {
        title: "Add Album",
        errors,
        album: body,
      });
    }

    const cover = file ? await this.uploadAlbumImage(file, body.title!, body.artist!) : {};

    const album = await this.albumsService.create({
      ...(body as CreateAlbumInput),
      ...cover,
    });

    req.session["flash"] = {
      success: [`${album.title} by ${album.artist} added`],
    };
    req.session.save(() => res.redirect(`/album/${album.slug}`));
  }

  @Get("/albums/:id/edit")
  @UseGuards(AdminGuard)
  @Render("editAlbum")
  async editForm(@Param("id") id: string) {
    const album = await this.albumsService.getAlbumById(id);
    if (!album) {
      throw new NotFoundException("Album not found");
    }
    return { title: `Edit ${album.title}`, album: albumForForm(album) };
  }

  @Post("/albums/:id")
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor("cover", albumImageMulterOptions))
  async update(
    @Param("id") id: string,
    @Body() body: AlbumFormBody,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const existing = await this.albumsService.getAlbumById(id);
    if (!existing) {
      throw new NotFoundException("Album not found");
    }

    const errors = validateAlbumBody(body);
    if (errors.length) {
      return res.status(200).render("editAlbum", {
        title: `Edit ${existing.title}`,
        errors,
        album: { ...body, id },
      });
    }

    const oldFileId = existing.imageFileId;
    const cover = file
      ? await this.uploadAlbumImage(file, body.title!, body.artist ?? existing.artist)
      : {};

    try {
      const album = await this.albumsService.update(id, {
        ...(body as UpdateAlbumInput),
        ...cover,
      });
      if (!album) {
        throw new NotFoundException("Album not found");
      }
      if (file && oldFileId) {
        void this.deleteImage(oldFileId);
      }
      req.session["flash"] = { success: [`${album.title} updated`] };
      req.session.save(() => res.redirect(`/album/${album.slug}`));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return res.status(200).render("editAlbum", {
          title: `Edit ${existing.title}`,
          errors: ["An album with that title already exists"],
          album: { ...body, id },
        });
      }
      throw err;
    }
  }

  @Post("/albums/:id/delete")
  @UseGuards(AdminGuard)
  async destroy(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    const existing = await this.albumsService.getAlbumById(id);
    if (!existing) {
      throw new NotFoundException("Album not found");
    }

    await this.albumsService.delete(id);
    if (existing.imageFileId) {
      void this.deleteImage(existing.imageFileId);
    }

    req.session["flash"] = { success: [`${existing.title} deleted`] };
    req.session.save(() => res.redirect("/albums"));
  }

  private async uploadAlbumImage(
    file: Express.Multer.File,
    title: string,
    artist: string,
  ): Promise<{ imageFileId: string; imagePath: string }> {
    const processed = await processImage(file.buffer, {
      maxDimension: 2000,
      aspectRatio: { w: 1, h: 1 },
      format: "jpeg",
    });

    const { fileId, filePath } = await this.imageKit.upload({
      buffer: processed.buffer,
      filenameHint: `${title}-${artist}`,
      folder: "albums",
    });

    return { imageFileId: fileId, imagePath: filePath };
  }

  // Best-effort cleanup — orphaned ImageKit asset must never fail the request
  private async deleteImage(fileId: string): Promise<void> {
    try {
      await this.imageKit.delete(fileId);
    } catch (err) {
      this.logger.error(`Failed to delete ImageKit file ${fileId}`, err);
    }
  }
}

function validateAlbumBody(body: AlbumFormBody): string[] {
  const errors: string[] = [];
  if (!body.title?.trim()) {
    errors.push("Album title is required");
  }
  return errors;
}

function albumForForm(album: Album): Record<string, unknown> {
  return {
    ...album,
    producer: album.producer.join(", "),
    engineer: album.engineer.join(", "),
    mixedBy: album.mixedBy.join(", "),
    tracks: album.tracks.join(", "),
    releaseDate: album.releaseDate ? new Date(album.releaseDate).toISOString().split("T")[0] : "",
  };
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; driverError?: { code?: string } };
  return e?.code === "23505" || e?.driverError?.code === "23505";
}
