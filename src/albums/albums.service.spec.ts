import { Repository } from "typeorm";
import { AlbumsService } from "./albums.service";
import { Album } from "../entities/album.entity";
import { Band } from "../entities/band.entity";

type AlbumRepoMock = jest.Mocked<
  Pick<Repository<Album>, "create" | "save" | "find" | "findOne" | "findAndCount" | "delete">
>;

type BandRepoMock = jest.Mocked<Pick<Repository<Band>, "findOne">>;

const mockBand = {
  id: "band-uuid",
  name: "Ride",
} as Band;

describe("AlbumsService", () => {
  let service: AlbumsService;
  let albumRepo: AlbumRepoMock;
  let bandRepo: BandRepoMock;

  beforeEach(() => {
    albumRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
    };
    bandRepo = {
      findOne: jest.fn(),
    };

    service = new AlbumsService(
      albumRepo as unknown as Repository<Album>,
      bandRepo as unknown as Repository<Band>,
    );

    bandRepo.findOne.mockResolvedValue(mockBand);
    albumRepo.create.mockImplementation((data) => data as Album);
    albumRepo.save.mockImplementation(async (entity) => entity as Album);
  });

  // TODO needs more coverage
  describe("create", () => {
    it("generates a slug from title", async () => {
      albumRepo.find.mockResolvedValue([]);

      await service.create({
        title: "Going Blank Again",
        artist: "Ride",
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
      });

      expect(albumRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "going-blank-again-3",
        }),
      );
    });

    it("parses comma-separated lists into arrays", async () => {
      albumRepo.find.mockResolvedValue([]);

      await service.create({
        title: "Loveless",
        artist: "My Bloody Valentine",
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
  });
});
