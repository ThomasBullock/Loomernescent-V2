import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { BandsController } from "./bands.controller";
import { BandsService } from "./bands.service";
import { ImageKitService } from "../common/images/image-kit.service";
import { SpotifyService } from "../spotify/spotify.service";
import { AdminGuard } from "../auth/guards/admin.guard";

jest.mock("../common/images/process-image", () => ({
  processImage: jest.fn().mockResolvedValue({ buffer: Buffer.from("processed") }),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockHero = [
  { type: "band", name: "Slowdive", slug: "slowdive", imagePath: "/bands/slowdive.jpg", cover: null },
];
const mockAlbums = [{ id: "a1", title: "Souvlaki", slug: "souvlaki" }];
const mockBand = {
  id: "b1",
  name: "Slowdive",
  slug: "slowdive",
  imageFileId: "ik-main-id",
  imagePath: "/bands/slowdive.jpg",
  personnel: ["Rachel Goswell", "Neil Halstead"],
  pastPersonnel: [] as string[],
  labels: ["Creation Records"],
  yearsActive: [new Date("1989-01-01"), new Date("1995-01-01"), new Date("2014-01-01")],
  gallery: [
    { fileId: "ik-gallery-1", filePath: "/bands/slowdive-g1.jpg" },
    { fileId: "ik-gallery-2", filePath: "/bands/slowdive-g2.jpg" },
  ],
  spotifyId: undefined as string | undefined,
  spotifyUrl: undefined as string | undefined,
};

const mockService = () => ({
  getHeroTiles: jest.fn().mockResolvedValue(mockHero),
  getBands: jest.fn().mockResolvedValue({ bands: [mockBand], page: 1, pages: 2, count: 10 }),
  getBandBySlug: jest.fn().mockResolvedValue({ band: mockBand, albums: mockAlbums }),
  getBandById: jest.fn().mockResolvedValue({ ...mockBand }),
  create: jest.fn().mockResolvedValue({ ...mockBand }),
  update: jest.fn().mockResolvedValue({ ...mockBand }),
  delete: jest.fn().mockResolvedValue(true),
  getBandsForMap: jest.fn().mockResolvedValue([]),
});

const mockAdminGuard = { canActivate: () => true };

type MockImageKit = { upload: jest.Mock; delete: jest.Mock; buildUrl: jest.Mock };
type MockSpotify = { searchArtist: jest.Mock };

function makeImageKit(): MockImageKit {
  return {
    upload: jest.fn().mockResolvedValue({ fileId: "ik-new-id", filePath: "/bands/new.jpg" }),
    delete: jest.fn().mockResolvedValue(undefined),
    buildUrl: jest.fn((path: string) => `https://img.test${path}`),
  };
}

function makeSpotify(): MockSpotify {
  return {
    searchArtist: jest.fn().mockResolvedValue({
      spotifyId: "sp-auto",
      spotifyUrl: "https://open.spotify.com/artist/sp-auto",
    }),
  };
}

function makeConfig(): { get: jest.Mock } {
  return { get: jest.fn().mockReturnValue("test-map-key") };
}

async function buildController(
  svc: ReturnType<typeof mockService>,
  imageKit: MockImageKit = makeImageKit(),
  spotify: MockSpotify = makeSpotify(),
  config: { get: jest.Mock } = makeConfig(),
): Promise<BandsController> {
  const moduleRef = await Test.createTestingModule({
    controllers: [BandsController],
    providers: [
      { provide: BandsService, useValue: svc },
      { provide: ImageKitService, useValue: imageKit },
      { provide: SpotifyService, useValue: spotify },
      { provide: ConfigService, useValue: config },
    ],
  })
    .overrideGuard(AdminGuard)
    .useValue(mockAdminGuard)
    .compile();
  return moduleRef.get(BandsController);
}

function makeReq(userId = "user-1"): Request {
  return {
    user: { id: userId },
    session: { save: jest.fn((cb: () => void) => cb()) },
  } as unknown as Request;
}

function makeRes() {
  const res = { render: jest.fn(), redirect: jest.fn() } as unknown as Response;
  (res as unknown as { status: jest.Mock }).status = jest.fn().mockReturnValue(res);
  return res as unknown as { status: jest.Mock; render: jest.Mock; redirect: jest.Mock };
}

const mockFile = {
  buffer: Buffer.from("image_data"),
  mimetype: "image/jpeg",
  originalname: "photo.jpg",
} as unknown as Express.Multer.File;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("BandsController", () => {
  describe("homePage", () => {
    it("Delegates to getHeroTiles and returns title", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const result = await controller.homePage();
      expect(svc.getHeroTiles).toHaveBeenCalled();
      expect(result).toEqual({ title: "Home", hero: mockHero });
    });
  });

  describe("getBands", () => {
    it("Parses page param as integer and passes to service", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const result = await controller.getBands("2");
      expect(svc.getBands).toHaveBeenCalledWith(2);
      expect(result).toMatchObject({ title: "Bands" });
    });

    it("Defaults to page 1 when param is undefined", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      await controller.getBands(undefined);
      expect(svc.getBands).toHaveBeenCalledWith(1);
    });
  });

  describe("addForm", () => {
    it("Returns title, empty band object, and mapKey from ConfigService", async () => {
      const svc = mockService();
      const config = makeConfig();
      const controller = await buildController(svc, makeImageKit(), makeSpotify(), config);
      const result = controller.addForm();
      expect(result).toEqual({ title: "Add Band", band: {}, mapKey: "test-map-key" });
      expect(config.get).toHaveBeenCalledWith("GOOGLE_MAPS_KEY");
    });
  });

  describe("getBandBySlug", () => {
    it("Throws NotFoundException when band is not found", async () => {
      const svc = mockService();
      svc.getBandBySlug.mockResolvedValue({ band: null, albums: [] });
      const controller = await buildController(svc);
      await expect(controller.getBandBySlug("missing-slug")).rejects.toThrow(NotFoundException);
    });

    it("Returns title, band, and albums when found", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const result = await controller.getBandBySlug("slowdive");
      expect(result).toEqual({ title: "Slowdive", band: mockBand, albums: mockAlbums });
    });
  });

  describe("editForm", () => {
    it("Throws NotFoundException when band is not found", async () => {
      const svc = mockService();
      svc.getBandById.mockResolvedValue(null);
      const controller = await buildController(svc);
      await expect(controller.editForm("missing-id")).rejects.toThrow(NotFoundException);
    });

    it("Serialises array fields to CSV via bandForForm and includes mapKey", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const result = await controller.editForm("b1");
      expect(result.band).toMatchObject({
        personnel: "Rachel Goswell, Neil Halstead",
        pastPersonnel: "",
        labels: "Creation Records",
        yearsActive: "1989, 1995, 2014",
      });
      expect(result.mapKey).toBe("test-map-key");
    });
  });

  describe("create", () => {
    let controller: BandsController;
    let svc: ReturnType<typeof mockService>;
    let imageKit: MockImageKit;
    let spotify: MockSpotify;

    const validBody = { name: "Slowdive" };

    beforeEach(async () => {
      svc = mockService();
      imageKit = makeImageKit();
      spotify = makeSpotify();
      controller = await buildController(svc, imageKit, spotify);
    });

    it("Re-renders editBand with errors when name is missing — service.create not called", async () => {
      const body = { name: "" };
      const req = makeReq();
      const res = makeRes();

      await controller.create(body, undefined, req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.render).toHaveBeenCalledWith(
        "editBand",
        expect.objectContaining({
          errors: expect.arrayContaining(["Band name is required"]),
          band: body,
          mapKey: "test-map-key",
        }),
      );
      expect(svc.create).not.toHaveBeenCalled();
    });

    it("Creates band without files — authorId from req.user, flash set, redirects to /band/{slug}", async () => {
      const req = makeReq("author-1");
      const res = makeRes();

      await controller.create(validBody, undefined, req, res as unknown as Response);

      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Slowdive", authorId: "author-1" }),
      );
      expect(imageKit.upload).not.toHaveBeenCalled();
      expect((req.session as unknown as { flash: unknown }).flash).toEqual({
        success: ["Slowdive added"],
      });
      expect(res.redirect).toHaveBeenCalledWith("/band/slowdive");
    });

    it("Creates band with square image + gallery — imageKit.upload called once per file, service.create receives image and gallery fields", async () => {
      const req = makeReq();
      const res = makeRes();
      const files = { image: [mockFile], gallery: [mockFile, mockFile] };

      await controller.create(validBody, files, req, res as unknown as Response);

      expect(imageKit.upload).toHaveBeenCalledTimes(3);
      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageFileId: "ik-new-id",
          imagePath: "/bands/new.jpg",
          gallery: [
            { fileId: "ik-new-id", filePath: "/bands/new.jpg" },
            { fileId: "ik-new-id", filePath: "/bands/new.jpg" },
          ],
        }),
      );
    });

    it("Re-renders editBand on unique constraint violation — does not re-throw", async () => {
      svc.create.mockRejectedValue({ code: "23505" });
      const req = makeReq();
      const res = makeRes();

      await controller.create(validBody, undefined, req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.render).toHaveBeenCalledWith(
        "editBand",
        expect.objectContaining({
          errors: ["A band with that name already exists"],
          band: validBody,
        }),
      );
    });

    it("Uses manual spotifyId/spotifyUrl when both provided — searchArtist not called", async () => {
      const bodyWithSpotify = {
        name: "Slowdive",
        spotifyId: "manual-sp-id",
        spotifyUrl: "https://open.spotify.com/artist/manual-sp-id",
      };
      const req = makeReq();
      const res = makeRes();

      await controller.create(bodyWithSpotify, undefined, req, res as unknown as Response);

      expect(spotify.searchArtist).not.toHaveBeenCalled();
      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({
          spotifyId: "manual-sp-id",
          spotifyUrl: "https://open.spotify.com/artist/manual-sp-id",
        }),
      );
    });

    it("Calls searchArtist with band name when no manual Spotify IDs provided", async () => {
      const req = makeReq();
      const res = makeRes();

      await controller.create(validBody, undefined, req, res as unknown as Response);

      expect(spotify.searchArtist).toHaveBeenCalledWith("Slowdive");
      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({ spotifyId: "sp-auto" }),
      );
    });
  });

  describe("update", () => {
    let controller: BandsController;
    let svc: ReturnType<typeof mockService>;
    let imageKit: MockImageKit;
    let spotify: MockSpotify;

    const validBody = { name: "Slowdive" };

    beforeEach(async () => {
      svc = mockService();
      imageKit = makeImageKit();
      spotify = makeSpotify();
      controller = await buildController(svc, imageKit, spotify);
    });

    it("Throws NotFoundException when band is not found", async () => {
      svc.getBandById.mockResolvedValue(null);
      const req = makeReq();
      const res = makeRes();
      await expect(
        controller.update("missing-id", validBody, undefined, req, res as unknown as Response),
      ).rejects.toThrow(NotFoundException);
    });

    it("Re-renders editBand with errors when name is missing — service.update not called", async () => {
      const body = { name: "" };
      const req = makeReq();
      const res = makeRes();

      await controller.update("b1", body, undefined, req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.render).toHaveBeenCalledWith(
        "editBand",
        expect.objectContaining({
          errors: expect.arrayContaining(["Band name is required"]),
          band: expect.objectContaining({ id: "b1" }),
        }),
      );
      expect(svc.update).not.toHaveBeenCalled();
    });

    it("Updates band without new file — no imageKit upload or delete, redirects to /band/{slug}", async () => {
      const req = makeReq();
      const res = makeRes();

      await controller.update("b1", validBody, undefined, req, res as unknown as Response);

      expect(imageKit.upload).not.toHaveBeenCalled();
      expect(imageKit.delete).not.toHaveBeenCalled();
      expect(svc.update).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/band/slowdive");
    });

    it("Updates band with new square image — old imageFileId deleted, new image fields passed to service", async () => {
      const req = makeReq();
      const res = makeRes();
      const files = { image: [mockFile] };

      await controller.update("b1", validBody, files, req, res as unknown as Response);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(imageKit.upload).toHaveBeenCalledTimes(1);
      expect(imageKit.delete).toHaveBeenCalledWith("ik-main-id");
      expect(svc.update).toHaveBeenCalledWith(
        "b1",
        expect.objectContaining({ imageFileId: "ik-new-id", imagePath: "/bands/new.jpg" }),
      );
    });

    it("Preserves existing spotifyId on update when none provided in body — searchArtist not called", async () => {
      const bandWithSpotify = {
        ...mockBand,
        spotifyId: "existing-sp-id",
        spotifyUrl: "https://open.spotify.com/artist/existing-sp-id",
      };
      svc.getBandById.mockResolvedValue(bandWithSpotify);
      svc.update.mockResolvedValue({ ...bandWithSpotify });
      const req = makeReq();
      const res = makeRes();

      await controller.update("b1", validBody, undefined, req, res as unknown as Response);

      expect(spotify.searchArtist).not.toHaveBeenCalled();
      expect(svc.update).toHaveBeenCalledWith(
        "b1",
        expect.objectContaining({ spotifyId: "existing-sp-id" }),
      );
    });
  });

  describe("destroy", () => {
    it("Throws NotFoundException when band is not found", async () => {
      const svc = mockService();
      svc.getBandById.mockResolvedValue(null);
      const controller = await buildController(svc);
      const req = makeReq();
      const res = makeRes();
      await expect(
        controller.destroy("missing-id", req, res as unknown as Response),
      ).rejects.toThrow(NotFoundException);
    });

    it("Deletes band and fires imageKit.delete for main image and all gallery items — flash set, redirects to /bands", async () => {
      const svc = mockService();
      const imageKit = makeImageKit();
      const controller = await buildController(svc, imageKit);
      const req = makeReq();
      const res = makeRes();

      await controller.destroy("b1", req, res as unknown as Response);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(svc.delete).toHaveBeenCalledWith("b1");
      expect(imageKit.delete).toHaveBeenCalledWith("ik-main-id");
      expect(imageKit.delete).toHaveBeenCalledWith("ik-gallery-1");
      expect(imageKit.delete).toHaveBeenCalledWith("ik-gallery-2");
      expect(imageKit.delete).toHaveBeenCalledTimes(3);
      expect((req.session as unknown as { flash: unknown }).flash).toEqual({
        success: ["Slowdive deleted"],
      });
      expect(res.redirect).toHaveBeenCalledWith("/bands");
    });
  });

  describe("mapData", () => {
    it("Delegates location params to getBandsForMap", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      await controller.mapData("-73.935", "40.730");
      expect(svc.getBandsForMap).toHaveBeenCalledWith("-73.935", "40.730");
    });
  });
});
