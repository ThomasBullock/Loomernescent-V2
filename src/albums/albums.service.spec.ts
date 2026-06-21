import { Repository } from "typeorm";
import { AlbumsService } from "./albums.service";
import { Album } from "../entities/album.entity";

type AlbumRepoMock = jest.Mocked<
  Pick<Repository<Album>, "create" | "save" | "find" | "findOne" | "findAndCount" | "delete">
>;

const mockAlbum = (overrides: Partial<Album> = {}): Album =>
  ({
    id: "album-uuid",
    title: "Nowhere",
    slug: "nowhere",
    artist: "Ride",
    bandId: "band-uuid",
    producer: [],
    engineer: [],
    mixedBy: [],
    tracks: [],
    releaseDate: null as unknown as Date,
    label: null as unknown as string,
    spotifyUrl: null as unknown as string,
    bandcampUrl: null as unknown as string,
    comments: null as unknown as string,
    imageFileId: null,
    imagePath: null,
    ...overrides,
  }) as Album;

describe("AlbumsService", () => {
  let service: AlbumsService;
  let albumRepo: AlbumRepoMock;

  beforeEach(() => {
    albumRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
    };

    service = new AlbumsService(albumRepo as unknown as Repository<Album>);

    albumRepo.create.mockImplementation((data) => data as Album);
    albumRepo.save.mockImplementation(async (entity) => entity as Album);
  });

  describe("getAlbumById", () => {
    it("returns the album when found", async () => {
      const album = { id: "album-uuid", title: "Nowhere" } as Album;
      albumRepo.findOne.mockResolvedValue(album);

      const result = await service.getAlbumById("album-uuid");

      expect(albumRepo.findOne).toHaveBeenCalledWith({ where: { id: "album-uuid" } });
      expect(result).toBe(album);
    });

    it("returns null when not found", async () => {
      albumRepo.findOne.mockResolvedValue(null);

      const result = await service.getAlbumById("missing-uuid");

      expect(result).toBeNull();
    });

    it("returns null on repository error", async () => {
      albumRepo.findOne.mockRejectedValue(new Error("db error"));

      const result = await service.getAlbumById("album-uuid");

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true when the album is deleted", async () => {
      albumRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

      const result = await service.delete("album-uuid");

      expect(albumRepo.delete).toHaveBeenCalledWith("album-uuid");
      expect(result).toBe(true);
    });

    it("returns false when the album does not exist", async () => {
      albumRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      const result = await service.delete("missing-uuid");

      expect(result).toBe(false);
    });

    it("returns false on repository error", async () => {
      albumRepo.delete.mockRejectedValue(new Error("db error"));

      const result = await service.delete("album-uuid");

      expect(result).toBe(false);
    });
  });

  describe("update", () => {
    it("returns null when the album is not found", async () => {
      albumRepo.findOne.mockResolvedValue(null);

      const result = await service.update("missing-uuid", { title: "Nowhere" });

      expect(result).toBeNull();
    });

    it("updates title and recomputes slug when title changes", async () => {
      albumRepo.findOne.mockResolvedValue(mockAlbum());
      albumRepo.find.mockResolvedValue([]);

      await service.update("album-uuid", { title: "Going Blank Again", artist: "Ride" });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Going Blank Again", slug: "going-blank-again" }),
      );
    });

    it("preserves slug when title is unchanged", async () => {
      albumRepo.findOne.mockResolvedValue(mockAlbum());

      await service.update("album-uuid", { title: "Nowhere", artist: "Ride" });

      expect(albumRepo.find).not.toHaveBeenCalled();
      expect(albumRepo.save).toHaveBeenCalledWith(expect.objectContaining({ slug: "nowhere" }));
    });

    it("updates bandId when supplied", async () => {
      albumRepo.findOne.mockResolvedValue(mockAlbum({ artist: "Ride", bandId: "ride-uuid" }));

      await service.update("album-uuid", {
        title: "Nowhere",
        artist: "My Bloody Valentine",
        bandId: "mbv-uuid",
      });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ artist: "My Bloody Valentine", bandId: "mbv-uuid" }),
      );
    });

    it("preserves existing bandId when none is supplied", async () => {
      albumRepo.findOne.mockResolvedValue(mockAlbum({ bandId: "ride-uuid" }));

      await service.update("album-uuid", { title: "Nowhere", artist: "Ride" });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bandId: "ride-uuid" }),
      );
    });

    it("preserves image when no new image supplied", async () => {
      albumRepo.findOne.mockResolvedValue(
        mockAlbum({ imageFileId: "existing-id", imagePath: "/albums/existing.jpg" }),
      );

      await service.update("album-uuid", { title: "Nowhere", artist: "Ride" });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          imageFileId: "existing-id",
          imagePath: "/albums/existing.jpg",
        }),
      );
    });

    it("updates image when new values are supplied", async () => {
      albumRepo.findOne.mockResolvedValue(
        mockAlbum({ imageFileId: "old-id", imagePath: "/albums/old.jpg" }),
      );

      await service.update("album-uuid", {
        title: "Nowhere",
        artist: "Ride",
        imageFileId: "new-id",
        imagePath: "/albums/new.jpg",
      });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ imageFileId: "new-id", imagePath: "/albums/new.jpg" }),
      );
    });

    it("parses comma-separated lists into arrays", async () => {
      albumRepo.findOne.mockResolvedValue(mockAlbum());

      await service.update("album-uuid", {
        title: "Nowhere",
        artist: "Ride",
        producer: "Alan Moulder, Flood",
        tracks: "Seagull, Polar Bear, Kaleidoscope",
      });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          producer: ["Alan Moulder", "Flood"],
          tracks: ["Seagull", "Polar Bear", "Kaleidoscope"],
        }),
      );
    });
  });

  describe("create", () => {
    it("generates a slug from title", async () => {
      albumRepo.find.mockResolvedValue([]);

      await service.create({
        title: "Going Blank Again",
        artist: "Ride",
        bandId: "band-uuid",
      });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "going-blank-again",
        }),
      );
    });

    it("appends a numeric suffix when base slug is taken", async () => {
      albumRepo.find.mockResolvedValue([{ slug: "going-blank-again" } as Album]);

      await service.create({
        title: "Going Blank Again",
        artist: "Ride",
        bandId: "band-uuid",
      });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "going-blank-again-1",
        }),
      );
    });

    it("increments suffix until a free slug is found", async () => {
      albumRepo.find.mockResolvedValue([
        { slug: "going-blank-again" } as Album,
        { slug: "going-blank-again-1" } as Album,
        { slug: "going-blank-again-2" } as Album,
      ]);

      await service.create({
        title: "Going Blank Again",
        artist: "Ride",
        bandId: "band-uuid",
      });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "going-blank-again-3",
        }),
      );
    });

    it("saves image fields when cover data is supplied", async () => {
      albumRepo.find.mockResolvedValue([]);
      await service.create({
        title: "Tarantula",
        artist: "Ride",
        bandId: "band-uuid",
        imageFileId: "new-uuid",
        imagePath: "/albums/Tarantula.jpg",
      });
      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          imageFileId: "new-uuid",
          imagePath: "/albums/Tarantula.jpg",
        }),
      );
    });

    it("parses comma-separated lists into arrays", async () => {
      albumRepo.find.mockResolvedValue([]);

      await service.create({
        title: "Loveless",
        artist: "My Bloody Valentine",
        bandId: "mbv-uuid",
        producer: "Kevin Shields",
        engineer: "Dick Meaney, Anjali Dutt, Guy Fixsen, Harold Burgon, Nick Robbins, Ingo Vauk",
        label: "Creation",
      });
      const saved = albumRepo.save.mock.calls[0][0];
      expect(saved.producer).toEqual(["Kevin Shields"]);
      expect(saved.engineer).toEqual([
        "Dick Meaney",
        "Anjali Dutt",
        "Guy Fixsen",
        "Harold Burgon",
        "Nick Robbins",
        "Ingo Vauk",
      ]);
    });

    it("persists bandId on the saved entity", async () => {
      albumRepo.find.mockResolvedValue([]);

      await service.create({
        title: "Nowhere",
        artist: "Ride",
        bandId: "band-uuid",
      });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bandId: "band-uuid" }),
      );
    });
  });
});
