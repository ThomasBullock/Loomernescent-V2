import {
  Controller,
  Get,
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
import { AlbumsService } from "./albums.service";
import { AdminGuard } from "src/auth/guards/admin.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { processImage } from "src/common/images/process-image";

// Gives TypeScript the type for the constructor param
import { ImageKitService } from "../common/images/image-kit.service";
import { memoryStorage } from "multer";
import { MAX_UPLOAD_BYTES } from "src/common/constants/image";

const albumImageMulterOptions = {
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

interface AlbumFormBody {
  title?: string;
  artist?: string;
  producer?: string;
  mixedBy?: string;
  engineer?: string;
  tracks?: string;
  releaseDate?: string;
  label?: string;
  spotifyURL?: string;
  bandCampURL?: string;
}

@Controller()
export class AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
    private readonly imageKit: ImageKitService, // Actually requests the injection
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
      return res.status(200).render("editBand", {
        title: "Add Album",
        errors,
        album: body,
      });
    }

    // tells the TypeScript compiler: "Hey, I know you think this value might be null or undefined, but I guarantee it exists at this exact moment.
    // Trust me, skip the type check here."
    const cover = file ? await this.uploadAlbumImage(file, body.title!, body.artist!) : {};
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
}

function validateAlbumBody(body: AlbumFormBody): string[] {
  const errors: string[] = [];
  if (!body.title?.trim()) {
    errors.push("Album title is required");
  }
  return errors;
}
