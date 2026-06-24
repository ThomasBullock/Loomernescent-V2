import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FavouritesService } from "./favourites.service";
import { Favourite } from "../entities/favourite.entity";

const makeMockRepo = () => ({
  findOneBy: jest.fn(),
  delete: jest.fn(),
  create: jest.fn((data: Partial<Favourite>) => data),
  save: jest.fn((data: Partial<Favourite>) => Promise.resolve({ id: "fav-1", ...data })),
  find: jest.fn(),
});

async function buildService(repo: ReturnType<typeof makeMockRepo>) {
  const moduleRef = await Test.createTestingModule({
    providers: [FavouritesService, { provide: getRepositoryToken(Favourite), useValue: repo }],
  }).compile();
  return moduleRef.get(FavouritesService);
}

describe("FavouritesService", () => {
  describe("toggleBand", () => {
    it("creates a favourite when none exists", async () => {
      const repo = makeMockRepo();
      repo.findOneBy.mockResolvedValue(null);
      const service = await buildService(repo);

      await service.toggleBand("user-1", "band-1");

      expect(repo.save).toHaveBeenCalledWith({ userId: "user-1", bandId: "band-1" });
    });

    it("removes the favourite when one already exists", async () => {
      const repo = makeMockRepo();
      repo.findOneBy.mockResolvedValue({ id: "fav-1", userId: "user-1", bandId: "band-1" });
      const service = await buildService(repo);

      await service.toggleBand("user-1", "band-1");

      expect(repo.delete).toHaveBeenCalledWith("fav-1");
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe("toggleAlbum", () => {
    it("creates a favourite when none exists", async () => {
      const repo = makeMockRepo();
      repo.findOneBy.mockResolvedValue(null);
      const service = await buildService(repo);

      await service.toggleAlbum("user-1", "album-1");

      expect(repo.save).toHaveBeenCalledWith({ userId: "user-1", albumId: "album-1" });
    });

    it("removes the favourite when one already exists", async () => {
      const repo = makeMockRepo();
      repo.findOneBy.mockResolvedValue({ id: "fav-2", userId: "user-1", albumId: "album-1" });
      const service = await buildService(repo);

      await service.toggleAlbum("user-1", "album-1");

      expect(repo.delete).toHaveBeenCalledWith("fav-2");
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe("togglePedal", () => {
    it("creates a favourite when none exists", async () => {
      const repo = makeMockRepo();
      repo.findOneBy.mockResolvedValue(null);
      const service = await buildService(repo);

      await service.togglePedal("user-1", "pedal-1");

      expect(repo.save).toHaveBeenCalledWith({ userId: "user-1", pedalId: "pedal-1" });
    });

    it("removes the favourite when one already exists", async () => {
      const repo = makeMockRepo();
      repo.findOneBy.mockResolvedValue({ id: "fav-3", userId: "user-1", pedalId: "pedal-1" });
      const service = await buildService(repo);

      await service.togglePedal("user-1", "pedal-1");

      expect(repo.delete).toHaveBeenCalledWith("fav-3");
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe("getFavourites", () => {
    it("returns bands, albums and pedals grouped separately", async () => {
      const repo = makeMockRepo();
      repo.find.mockResolvedValue([
        { band: { id: "b1", name: "Slowdive" }, album: null, pedal: null },
        { band: null, album: { id: "a1", title: "Souvlaki" }, pedal: null },
        { band: null, album: null, pedal: { id: "p1", name: "Big Muff" } },
      ]);
      const service = await buildService(repo);

      const result = await service.getFavourites("user-1");

      expect(result.bands).toEqual([{ id: "b1", name: "Slowdive" }]);
      expect(result.albums).toEqual([{ id: "a1", title: "Souvlaki" }]);
      expect(result.pedals).toEqual([{ id: "p1", name: "Big Muff" }]);
    });

    it("returns empty arrays when user has no favourites", async () => {
      const repo = makeMockRepo();
      repo.find.mockResolvedValue([]);
      const service = await buildService(repo);

      const result = await service.getFavourites("user-1");

      expect(result.bands).toEqual([]);
      expect(result.albums).toEqual([]);
      expect(result.pedals).toEqual([]);
    });
  });
});
