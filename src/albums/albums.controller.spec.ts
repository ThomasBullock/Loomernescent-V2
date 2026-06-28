import { Test } from "@nestjs/testing";
import { AuthGuard } from "../auth/guards/auth.guard";
import { AlbumsController } from "./albums.controller";
import { AlbumsService } from "./albums.service";
import { BandsService } from "../bands/bands.service";
import { ImageKitService } from "../common/images/image-kit.service";
import { SpotifyService } from "../spotify/spotify.service";

const mockAlbums = [
  { id: "a1", title: "Souvlaki", slug: "souvlaki" },
  { id: "a2", title: "Just for a Day", slug: "just-for-a-day" },
  { id: "a3", title: "Loveless", slug: "loveless" },
  { id: "a4", title: "Isn't Anything", slug: "isnt-anything" },
  { id: "a5", title: "Whirlpool", slug: "whirlpool" },
  { id: "a6", title: "Nowhere", slug: "nowhere" },
  { id: "a7", title: "Going Blank Again", slug: "going-blank-again" },
  { id: "a8", title: "EP 1991", slug: "ep-1991" },
  { id: "a9", title: "Colour Trip", slug: "colour-trip" },
  { id: "a10", title: "Spica", slug: "spica" },
];

const mockService = () => ({
  getAlbums: jest.fn().mockResolvedValue({ albums: mockAlbums, page: 1, pages: 2, count: 10 }),
});

const mockAuthGuard = { canActivate: () => true };

async function buildController(svc: ReturnType<typeof mockService>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [AlbumsController],
    providers: [
      { provide: AlbumsService, useValue: svc },
      { provide: BandsService, useValue: svc },
      { provide: ImageKitService, useValue: svc },
      { provide: SpotifyService, useValue: svc },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue(mockAuthGuard)
    .compile();
  return moduleRef.get(AlbumsController);
}

// function makeReq(referer?: string): Request {
//   return {
//     headers: { referer },
//   } as unknown as Request;
// }

// function makeRes(): { redirect: jest.Mock } & Partial<Response> {
//   return { redirect: jest.fn() };
// }

describe("AlbumsController", () => {
  describe("getAlbums", () => {
    it("Passes page param and returns title", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const result = await controller.getAlbums("1");
      expect(result).toEqual({ title: "Albums", albums: mockAlbums, page: 1, pages: 2, count: 10 });
      expect(svc.getAlbums).toHaveBeenCalledWith(1);
    });

    it("Defaults to page 1 when passed undefined", async () => {
      const svc = mockService();
      const controller = await buildController(svc);

      const result = await controller.getAlbums(undefined);
      expect(result).toEqual({ title: "Albums", albums: mockAlbums, page: 1, pages: 2, count: 10 });
      expect(svc.getAlbums).toHaveBeenCalledWith(1);
    });
  });

  describe("addForm", () => {
    it("Returns title and empty pedal object", async () => {
      const svc = mockService();
      const controller = await buildController(svc);
      const result = controller.addForm();
      expect(result).toEqual({
        title: "Add Album",
        album: {},
      });
    });
  });
});
