import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Render,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request, Response } from "express";
import { PedalsService, CreatePedalInput } from "./pedals.service";
import { Pedal } from "../entities/pedal.entity";
import { AdminGuard } from "../auth/guards/admin.guard";
import { ImageKitService } from "../common/images/image-kit.service";
import { processImage } from "../common/images/process-image";
import { MAX_UPLOAD_BYTES } from "../common/constants/image";

const pedalImageMulterOptions = {
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

interface PedalFormBody {
  brand?: string;
  name?: string;
  pedalType?: string;
  pedalType2?: string;
  yearsManufactured?: string;
  comments?: string;
  youtube?: string;
  associatedArtists?: string;
}

@Controller()
export class PedalsController {
  private readonly logger = new Logger(PedalsController.name);

  constructor(
    private readonly pedalsService: PedalsService,
    private readonly imageKit: ImageKitService,
  ) {}

  @Get("/pedals")
  @Render("pedals")
  async getPedals(@Query("page") page?: string) {
    const pageNum = parseInt(page || "1", 10) || 1;
    const result = await this.pedalsService.getPedals(pageNum);
    return { title: "Pedals", ...result };
  }

  @Get("/pedals/page/:page")
  @Render("pedals")
  async getPedalsPaginated(@Param("page") page: string) {
    const pageNum = parseInt(page, 10) || 1;
    const result = await this.pedalsService.getPedals(pageNum);
    return { title: "Pedals", ...result };
  }

  @Get("/pedals/new")
  @UseGuards(AdminGuard)
  @Render("addPedal")
  addForm() {
    return { title: "Add Pedal", pedal: {} };
  }

  @Post("/pedals")
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor("image", pedalImageMulterOptions))
  async create(
    @Body() body: PedalFormBody,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const errors = validatePedalBody(body);
    if (errors.length) {
      return res.status(200).render("addPedal", {
        title: "Add Pedal",
        errors,
        pedal: body,
      });
    }

    let image = {};
    try {
      if (file) {
        image = await this.uploadPedalImage(file, body.brand!, body.name!);
      }
    } catch {
      return res.status(200).render("addPedal", {
        title: "Add Pedal",
        errors: ["Image upload failed — please try again"],
        album: body,
      });
    }

    try {
      const usedBy = await this.pedalsService.resolveUsedBy(body.associatedArtists ?? "");
      const pedal = await this.pedalsService.create({
        ...(body as CreatePedalInput),
        usedBy,
        ...image,
      });
      req.session["flash"] = {
        success: [`${pedal.brand} ${pedal.name} added`],
      };
      req.session.save(() => res.redirect(`/pedal/${pedal.slug}`));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return res.status(200).render("addPedal", {
          title: "Add Pedal",
          errors: ["A pedal with that brand and name already exists"],
          pedal: body,
        });
      }
      throw err;
    }
  }

  @Get("/pedals/:id/edit")
  @UseGuards(AdminGuard)
  @Render("editPedal")
  async editForm(@Param("id") id: string) {
    const pedal = await this.pedalsService.getPedalById(id);
    if (!pedal) {
      throw new NotFoundException("Pedal not found");
    }
    return {
      title: `Edit ${pedal.brand} ${pedal.name}`,
      pedal: pedalForForm(pedal),
    };
  }

  @Post("/pedals/:id")
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor("image", pedalImageMulterOptions))
  async update(
    @Param("id") id: string,
    @Body() body: PedalFormBody,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const existing = await this.pedalsService.getPedalById(id);
    if (!existing) {
      throw new NotFoundException("Pedal not found");
    }

    const errors = validatePedalBody(body);
    if (errors.length) {
      return res.status(200).render("editPedal", {
        title: `Edit ${existing.brand} ${existing.name}`,
        errors,
        pedal: { ...body, id },
      });
    }

    const oldFileId = existing.imageFileId;
    const image = file ? await this.uploadPedalImage(file, body.brand!, body.name!) : {};

    try {
      const usedBy = await this.pedalsService.resolveUsedBy(body.associatedArtists ?? "");
      const pedal = await this.pedalsService.update(id, {
        ...(body as CreatePedalInput),
        usedBy,
        ...image,
      });
      if (!pedal) {
        throw new NotFoundException("Pedal not found");
      }
      if (file && oldFileId) {
        void this.deleteImage(oldFileId);
      }
      req.session["flash"] = {
        success: [`${pedal.brand} ${pedal.name} updated`],
      };
      req.session.save(() => res.redirect(`/pedal/${pedal.slug}`));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return res.status(200).render("editPedal", {
          title: `Edit ${existing.brand} ${existing.name}`,
          errors: ["A pedal with that brand and name already exists"],
          pedal: { ...body, id },
        });
      }
      throw err;
    }
  }

  @Post("/pedals/:id/delete")
  @UseGuards(AdminGuard)
  async destroy(@Param("id") id: string, @Req() req: Request, @Res() res: Response) {
    const existing = await this.pedalsService.getPedalById(id);
    if (!existing) {
      throw new NotFoundException("Pedal not found");
    }

    await this.pedalsService.delete(id);
    if (existing.imageFileId) {
      void this.deleteImage(existing.imageFileId);
    }
    req.session["flash"] = {
      success: [`${existing.brand} ${existing.name} deleted`],
    };
    req.session.save(() => res.redirect("/pedals"));
  }

  private async uploadPedalImage(
    file: Express.Multer.File,
    brand: string,
    name: string,
  ): Promise<{ imageFileId: string; imagePath: string }> {
    const processed = await processImage(file.buffer, {
      maxDimension: 2000,
      aspectRatio: { w: 1, h: 1 },
      format: "jpeg",
      quality: 85,
    });
    const { fileId, filePath } = await this.imageKit.upload({
      buffer: processed.buffer,
      filenameHint: `${brand}-${name}`,
      folder: "pedals",
    });
    return { imageFileId: fileId, imagePath: filePath };
  }

  // Best-effort cleanup; an orphaned ImageKit asset must never fail the request.
  private async deleteImage(fileId: string): Promise<void> {
    try {
      await this.imageKit.delete(fileId);
    } catch (err) {
      this.logger.error(`Failed to delete ImageKit file ${fileId}`, err);
    }
  }

  @Get("/pedal/:slug")
  @Render("pedal")
  async getPedalBySlug(@Param("slug") slug: string) {
    const pedal = await this.pedalsService.getPedalBySlug(slug);
    if (!pedal) {
      throw new NotFoundException("Pedal not found");
    }
    return { title: `${pedal.brand} ${pedal.name}`, pedal };
  }
}

function pedalForForm(pedal: Pedal): Record<string, unknown> {
  return {
    ...pedal,
    associatedArtists: (pedal.usedBy ?? []).map((u) => u.artist).join(", "),
    yearsManufactured:
      pedal.yearsManufactured?.map((d) => new Date(d).getUTCFullYear()).join(", ") ?? "",
  };
}

function validatePedalBody(body: PedalFormBody): string[] {
  const errors: string[] = [];
  if (!body.brand?.trim()) {
    errors.push("Brand is required");
  }
  if (!body.name?.trim()) {
    errors.push("Pedal name is required");
  }
  return errors;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; driverError?: { code?: string } };
  return e?.code === "23505" || e?.driverError?.code === "23505";
}
