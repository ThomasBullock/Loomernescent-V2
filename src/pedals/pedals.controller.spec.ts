import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import type { Request, Response } from "express";
import { PedalsService } from "./pedals.service";
import { ImageKitService } from "../common/images/image-kit.service";
import { PedalsController } from "./pedals.controller";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

jest.mock("../common/images/process-image", () => ({
  processImage: jest.fn().mockResolvedValue({ buffer: Buffer.from("processed") }),
}));

const mockPedal = { id: "p1", brand: "Boss", name: "PH-1 Phaser", slug: "boss-ph-1-phaser" };
const mockPedals = [mockPedal];

const mockService = () => ({
  getPedals: jest.fn().mockResolvedValue({ pedals: mockPedals, page: 1, pages: 2, count: 10 }),
  getPedalBySlug: jest.fn().mockResolvedValue({ ...mockPedal }),
  getPedalById: jest.fn().mockResolvedValue({ ...mockPedal }),
  create: jest.fn().mockResolvedValue({ ...mockPedal }),
  update: jest.fn().mockResolvedValue({ ...mockPedal }),
  delete: jest.fn().mockResolvedValue(undefined),
  resolveUsedBy: jest.fn().mockResolvedValue([]),
});

const mockAdminGuard = { canActivate: () => true };
const mockAuthGuard = { canActivate: () => true };

async function buildController(
  svc: ReturnType<typeof mockService>,
  imageKit: { upload: jest.Mock; delete: jest.Mock } = { upload: jest.fn(), delete: jest.fn() },
) {
  const moduleRef = await Test.createTestingModule({
    controllers: [PedalsController],
    providers: [
      { provide: PedalsService, useValue: svc },
      { provide: ImageKitService, useValue: imageKit },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue(mockAuthGuard)
    .overrideGuard(AdminGuard)
    .useValue(mockAdminGuard)
    .compile();
  return moduleRef.get(PedalsController);
}

function makeReq(): Request {
  return {
    session: {
      save: jest.fn((cb: () => void) => cb()),
    },
  } as unknown as Request;
}

function makeRes(): { status: jest.Mock; render: jest.Mock; redirect: jest.Mock } {
  const res = { render: jest.fn(), redirect: jest.fn() } as unknown as Response;
  (res as unknown as { status: jest.Mock }).status = jest.fn().mockReturnValue(res);
  return res as unknown as { status: jest.Mock; render: jest.Mock; redirect: jest.Mock };
}

const mockFile = {
  buffer: Buffer.from("image_data"),
  mimetype: "image/jpeg",
  originalname: "photo.jpg",
} as unknown as Express.Multer.File;

describe("PedalsController", () => {
  describe("getPedals", () => {
    it("Passes page param and returns title", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const result = await controller.getPedals("1");
      expect(result).toEqual({
        title: "Pedals",
        pedals: mockPedals,
        page: 1,
        pages: 2,
        count: 10,
      });
      expect(svc.getPedals).toHaveBeenCalledWith(1);
    });

    // it("Defaults to page 1 when query param is undefined")
  });

  describe("getPedalsPaginated", () => {
    // it("Parses :page param and returns title with service result")
  });

  describe("addForm", () => {
    it("Returns title and empty pedal object", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const result = controller.addForm();
      expect(result).toEqual({
        title: "Add Pedal",
        pedal: {},
      });
    });
  });

  describe("getPedalBySlug", () => {
    let controller: PedalsController;
    let svc: ReturnType<typeof mockService>;

    beforeEach(async () => {
      svc = mockService();
      controller = await buildController(svc);
    });

    it("Throws NotFoundException when pedal is missing", async () => {
      svc.getPedalBySlug.mockResolvedValue(null);
      await expect(controller.getPedalBySlug("bla-bla")).rejects.toThrow(NotFoundException);
    });

    it("Returns title and pedal when found", async () => {
      const result = await controller.getPedalBySlug("boss-ph-1-phaser");
      expect(result).toEqual({
        title: "Boss PH-1 Phaser",
        pedal: mockPedal,
      });
    });
  });

  describe("editForm", () => {
    // it("Throws NotFoundException when pedal is missing")
    // it("Returns title and pedal with yearsManufactured formatted for the form")
  });

  describe("create", () => {
    let controller: PedalsController;
    let svc: ReturnType<typeof mockService>;
    let imageKit: { upload: jest.Mock; delete: jest.Mock };

    const validBody = { brand: "Boss", name: "PH-1 Phaser" };

    beforeEach(async () => {
      svc = mockService();
      imageKit = { upload: jest.fn(), delete: jest.fn() };
      controller = await buildController(svc, imageKit);
    });

    it("re-renders addPedal when validation fails — service.create not called", async () => {
      const body = { brand: "", name: "PH-1 Phaser" };
      const req = makeReq();
      const res = makeRes();

      await controller.create(body, undefined, req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.render).toHaveBeenCalledWith(
        "addPedal",
        expect.objectContaining({
          errors: expect.arrayContaining(["Brand is required"]),
          pedal: body,
        }),
      );
      expect(svc.create).not.toHaveBeenCalled();
    });

    it("creates pedal without file — service.create called, flash set, redirects to /pedal/{slug}", async () => {
      const req = makeReq();
      const res = makeRes();

      await controller.create(validBody, undefined, req, res as unknown as Response);

      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({ brand: "Boss", name: "PH-1 Phaser" }),
      );
      expect(imageKit.upload).not.toHaveBeenCalled();
      expect((req.session as unknown as { flash: unknown }).flash).toEqual({
        success: ["Boss PH-1 Phaser added"],
      });
      expect(res.redirect).toHaveBeenCalledWith("/pedal/boss-ph-1-phaser");
    });

    it("creates pedal with file — imageKit.upload called, create receives image fields, redirects to /pedal/{slug}", async () => {
      imageKit.upload.mockResolvedValue({ fileId: "ik-file-id", filePath: "/pedals/boss-ph1.jpg" });
      const req = makeReq();
      const res = makeRes();

      await controller.create(validBody, mockFile, req, res as unknown as Response);

      expect(imageKit.upload).toHaveBeenCalledTimes(1);
      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({
          brand: "Boss",
          imageFileId: "ik-file-id",
          imagePath: "/pedals/boss-ph1.jpg",
        }),
      );
      expect(res.redirect).toHaveBeenCalledWith("/pedal/boss-ph-1-phaser");
    });

    it("re-renders addPedal on unique constraint violation", async () => {
      svc.create.mockRejectedValue({ code: "23505" });
      const req = makeReq();
      const res = makeRes();

      await controller.create(validBody, undefined, req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.render).toHaveBeenCalledWith(
        "addPedal",
        expect.objectContaining({
          errors: ["A pedal with that brand and name already exists"],
          pedal: validBody,
        }),
      );
    });

    it("re-renders addPedal when image upload fails — service.create not called", async () => {
      imageKit.upload.mockRejectedValue(new Error("upload failed"));
      const req = makeReq();
      const res = makeRes();

      await controller.create(validBody, mockFile, req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.render).toHaveBeenCalledWith(
        "addPedal",
        expect.objectContaining({
          errors: ["Image upload failed — please try again"],
        }),
      );
      expect(svc.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    // @Res handler — same setup notes as create.
    // it("Throws NotFoundException when pedal is missing")
    // it("Re-renders editPedal when validation fails — service.update not called")
    // it("Updates pedal without file — service.update called, no imageKit upload or delete")
    // it("Updates pedal with new file — service.update called, imageKit.delete on old fileId, redirects to /pedal/{slug}")
    // it("Re-renders editPedal on unique constraint violation")
  });

  describe("destroy", () => {
    // @Res handler — same setup notes as create.
    // it("Throws NotFoundException when pedal is missing")
    // it("Deletes pedal and imageKit asset when imageFileId is set — redirects to /pedals, flash set")
    // it("Deletes pedal only when imageFileId is null — imageKit.delete not called")
  });
});
