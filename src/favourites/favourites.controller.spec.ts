import { Test } from "@nestjs/testing";
import { FavouritesController } from "./favourites.controller";
import { FavouritesService } from "./favourites.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import type { Request, Response } from "express";

const mockService = () => ({
  toggleBand: jest.fn().mockResolvedValue(undefined),
  toggleAlbum: jest.fn().mockResolvedValue(undefined),
  togglePedal: jest.fn().mockResolvedValue(undefined),
  getFavourites: jest.fn().mockResolvedValue({ bands: [], albums: [], pedals: [] }),
});

const mockAuthGuard = { canActivate: () => true };

async function buildController(svc: ReturnType<typeof mockService>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [FavouritesController],
    providers: [{ provide: FavouritesService, useValue: svc }],
  })
    .overrideGuard(AuthGuard)
    .useValue(mockAuthGuard)
    .compile();
  return moduleRef.get(FavouritesController);
}

function makeReq(userId = "user-1", referer?: string): Request {
  return {
    user: { id: userId },
    headers: { referer },
  } as unknown as Request;
}

function makeRes(): { redirect: jest.Mock } & Partial<Response> {
  return { redirect: jest.fn() };
}

describe("FavouritesController", () => {
  describe("getFavourites", () => {
    it("returns title and empty collections when user has no favourites", async () => {
      const svc = mockService();
      const controller = await buildController(svc);

      const result = await controller.getFavourites(makeReq());

      expect(result).toEqual({ title: "My Favourites", bands: [], albums: [], pedals: [] });
      expect(svc.getFavourites).toHaveBeenCalledWith("user-1");
    });

    it("returns populated collections from the service", async () => {
      const svc = mockService();
      svc.getFavourites.mockResolvedValue({
        bands: [{ id: "b1", name: "Slowdive" }],
        albums: [],
        pedals: [],
      });
      const controller = await buildController(svc);

      const result = await controller.getFavourites(makeReq());

      expect(result.bands).toHaveLength(1);
      expect(result.bands[0]).toMatchObject({ name: "Slowdive" });
    });
  });

  describe("toggleBand", () => {
    it("calls toggleBand on service with user id and band id", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const res = makeRes();

      await controller.toggleBand("band-42", makeReq("user-1"), res as unknown as Response);

      expect(svc.toggleBand).toHaveBeenCalledWith("user-1", "band-42");
    });

    it("redirects to the referer header when present", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const res = makeRes();

      await controller.toggleBand(
        "band-1",
        makeReq("user-1", "/bands"),
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledWith("/bands");
    });

    it("redirects to /bands when referer header is absent", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const res = makeRes();

      await controller.toggleBand(
        "band-1",
        makeReq("user-1", undefined),
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledWith("/bands");
    });
  });

  describe("toggleAlbum", () => {
    it("calls toggleAlbum on service with user id and album id", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const res = makeRes();

      await controller.toggleAlbum("album-7", makeReq("user-1"), res as unknown as Response);

      expect(svc.toggleAlbum).toHaveBeenCalledWith("user-1", "album-7");
    });

    it("redirects to /albums when referer header is absent", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const res = makeRes();

      await controller.toggleAlbum(
        "album-1",
        makeReq("user-1", undefined),
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledWith("/albums");
    });
  });

  describe("togglePedal", () => {
    it("calls togglePedal on service with user id and pedal id", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const res = makeRes();

      await controller.togglePedal("pedal-9", makeReq("user-1"), res as unknown as Response);

      expect(svc.togglePedal).toHaveBeenCalledWith("user-1", "pedal-9");
    });

    it("redirects to /pedals when referer header is absent", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const res = makeRes();

      await controller.togglePedal(
        "pedal-1",
        makeReq("user-1", undefined),
        res as unknown as Response,
      );

      expect(res.redirect).toHaveBeenCalledWith("/pedals");
    });
  });
});
