import { Repository } from "typeorm";
import { PedalsService } from "./pedals.service";
import { Pedal } from "../entities/pedal.entity";
import { Band } from "../entities/band.entity";

type PedalRepoMock = jest.Mocked<
  Pick<Repository<Pedal>, "save" | "findOne" | "findAndCount" | "delete">
>;

type BandRepoMock = {
  createQueryBuilder: jest.Mock;
};

const mockPedal = (overrides: Partial<Pedal> = {}): Pedal =>
  ({
    id: "pedal-uuid",
    brand: "Big Muff",
    name: "Pi",
    slug: "big-muff-pi",
    pedalType: null as unknown as string,
    pedalType2: null as unknown as string,
    usedBy: [],
    associatedBand: null as unknown as Band,
    associatedBandId: null as unknown as string,
    yearsManufactured: [],
    imageFileId: null,
    imagePath: null,
    comments: null as unknown as string,
    youtube: null as unknown as string,
    createdAt: new Date("2020-01-01T00:00:00Z"),
    favourites: [],
    ...overrides,
  }) as Pedal;

function makeQb(bands: Partial<Band>[]) {
  return {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(bands),
  };
}

describe("PedalsService", () => {
  let service: PedalsService;
  let repo: PedalRepoMock;
  let bandRepo: BandRepoMock;

  beforeEach(() => {
    repo = {
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
    } as unknown as PedalRepoMock;
    bandRepo = {
      createQueryBuilder: jest.fn(),
    };
    service = new PedalsService(
      repo as unknown as Repository<Pedal>,
      bandRepo as unknown as Repository<Band>,
    );
  });

  describe("create", () => {
    it("generates a slug from brand and name", async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({ brand: "Big Muff", name: "Pi", usedBy: [] });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "big-muff-pi",
          brand: "Big Muff",
          name: "Pi",
        }),
      );
    });

    it("lowercases and strips punctuation in slugs", async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({ brand: "Boss DD-3T", name: "Digital Delay", usedBy: [] });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.slug).toBe("boss-dd-3t-digital-delay");
    });

    it('drops pedalType2 when value is "None"', async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({
        brand: "X",
        name: "Y",
        pedalType: "Fuzz",
        pedalType2: "None",
        usedBy: [],
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.pedalType).toBe("Fuzz");
      expect(arg.pedalType2).toBeFalsy();
    });

    it("parses yearsManufactured CSV into Date[]", async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({
        brand: "X",
        name: "Y",
        yearsManufactured: "1972, 1973, 1974",
        usedBy: [],
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.yearsManufactured).toHaveLength(3);
      expect(arg.yearsManufactured?.[0]).toBeInstanceOf(Date);
      expect(arg.yearsManufactured?.[0].getUTCFullYear()).toBe(1972);
      expect(arg.yearsManufactured?.[2].getUTCFullYear()).toBe(1974);
    });

    it("treats missing yearsManufactured as []", async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({ brand: "X", name: "Y", usedBy: [] });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.yearsManufactured).toEqual([]);
    });

    it("persists imageFileId and imagePath when supplied", async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({
        brand: "X",
        name: "Y",
        imageFileId: "fid-1",
        imagePath: "/pedals/x-y.jpg",
        usedBy: [],
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.imageFileId).toBe("fid-1");
      expect(arg.imagePath).toBe("/pedals/x-y.jpg");
    });

    it("omits image columns when not supplied", async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({ brand: "X", name: "Y", usedBy: [] });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.imageFileId).toBeUndefined();
      expect(arg.imagePath).toBeUndefined();
    });

    it("persists usedBy entries when supplied", async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      const usedBy = [{ artist: "Rachel Goswell", band: "Slowdive", slug: "slowdive" }];
      await service.create({ brand: "X", name: "Y", usedBy });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.usedBy).toEqual(usedBy);
    });

    it("persists an empty usedBy array when provided", async () => {
      repo.save.mockImplementation(async (entity) => entity as Pedal);
      await service.create({ brand: "X", name: "Y", usedBy: [] });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.usedBy).toEqual([]);
    });
  });

  describe("getPedalById", () => {
    it("queries by id", async () => {
      const pedal = mockPedal({ id: "abc", brand: "X" });
      repo.findOne.mockResolvedValue(pedal);
      const result = await service.getPedalById("abc");
      expect(result).toBe(pedal);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "abc" } });
    });

    it("returns null when the id is malformed", async () => {
      repo.findOne.mockRejectedValue(new Error("invalid input syntax for type uuid"));
      const result = await service.getPedalById("not-a-uuid");
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    const existing = mockPedal({
      id: "pedal-1",
      brand: "Big Muff",
      name: "Pi",
      slug: "big-muff-pi",
      comments: "original",
      usedBy: [],
      yearsManufactured: [new Date("1969-01-01T00:00:00Z")],
    });

    it("returns null when the pedal does not exist", async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.update("missing", {
        brand: "X",
        name: "Y",
        usedBy: [],
      });
      expect(result).toBeNull();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("keeps the slug when brand and name are unchanged", async () => {
      repo.findOne.mockResolvedValue(mockPedal(existing));
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update("pedal-1", {
        brand: "Big Muff",
        name: "Pi",
        comments: "updated",
        usedBy: [],
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.slug).toBe("big-muff-pi");
      expect(arg.comments).toBe("updated");
    });

    it("regenerates the slug when brand changes", async () => {
      repo.findOne.mockResolvedValue(mockPedal(existing));
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update("pedal-1", { brand: "Boss", name: "Pi", usedBy: [] });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.slug).toBe("boss-pi");
    });

    it("regenerates the slug when name changes", async () => {
      repo.findOne.mockResolvedValue(mockPedal(existing));
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update("pedal-1", { brand: "Big Muff", name: "Deluxe", usedBy: [] });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.slug).toBe("big-muff-deluxe");
    });

    it("overwrites imageFileId and imagePath when supplied", async () => {
      repo.findOne.mockResolvedValue(
        mockPedal({
          ...existing,
          imageFileId: "old-fid",
          imagePath: "/pedals/old.jpg",
        }),
      );
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update("pedal-1", {
        brand: "Big Muff",
        name: "Pi",
        imageFileId: "new-fid",
        imagePath: "/pedals/new.jpg",
        usedBy: [],
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.imageFileId).toBe("new-fid");
      expect(arg.imagePath).toBe("/pedals/new.jpg");
    });

    it("leaves imageFileId and imagePath untouched when not supplied", async () => {
      repo.findOne.mockResolvedValue(
        mockPedal({
          ...existing,
          imageFileId: "old-fid",
          imagePath: "/pedals/old.jpg",
        }),
      );
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update("pedal-1", {
        brand: "Big Muff",
        name: "Pi",
        comments: "updated",
        usedBy: [],
      });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.imageFileId).toBe("old-fid");
      expect(arg.imagePath).toBe("/pedals/old.jpg");
    });

    it("sets usedBy from input on update", async () => {
      repo.findOne.mockResolvedValue({ ...existing } as Pedal);
      repo.save.mockImplementation(async (e) => e as Pedal);
      const usedBy = [{ artist: "Rachel Goswell", band: "Slowdive", slug: "slowdive" }];
      await service.update("pedal-1", { brand: "Big Muff", name: "Pi", usedBy });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.usedBy).toEqual(usedBy);
    });

    it("clears usedBy when an empty array is provided", async () => {
      repo.findOne.mockResolvedValue({
        ...existing,
        usedBy: [{ artist: "Rachel Goswell", band: "Slowdive", slug: "slowdive" }],
      } as Pedal);
      repo.save.mockImplementation(async (e) => e as Pedal);
      await service.update("pedal-1", { brand: "Big Muff", name: "Pi", usedBy: [] });
      const arg = repo.save.mock.calls[0][0] as Partial<Pedal>;
      expect(arg.usedBy).toEqual([]);
    });
  });

  describe("delete", () => {
    it("deletes by id and returns true", async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });
      const result = await service.delete("abc");
      expect(result).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith("abc");
    });

    it("returns false when nothing is deleted", async () => {
      repo.delete.mockResolvedValue({ affected: 0, raw: [] });
      const result = await service.delete("missing");
      expect(result).toBe(false);
    });
  });

  describe("resolveUsedBy", () => {
    it("returns [] for an empty string without querying the DB", async () => {
      const result = await service.resolveUsedBy("");
      expect(result).toEqual([]);
      expect(bandRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("returns [] for a whitespace-only string", async () => {
      const result = await service.resolveUsedBy("   ");
      expect(result).toEqual([]);
      expect(bandRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("returns [] for comma-separated blank entries", async () => {
      const result = await service.resolveUsedBy(", ,  ,");
      expect(result).toEqual([]);
      expect(bandRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("returns [] when no bands match the artist names", async () => {
      bandRepo.createQueryBuilder.mockReturnValue(makeQb([]));
      const result = await service.resolveUsedBy("Nobody Famous");
      expect(result).toEqual([]);
    });

    it("maps a single artist to their band", async () => {
      const band = {
        name: "Slowdive",
        slug: "slowdive",
        personnel: ["Rachel Goswell", "Neil Halstead", "Nick Chaplin"],
      };
      bandRepo.createQueryBuilder.mockReturnValue(makeQb([band]));
      const result = await service.resolveUsedBy("Rachel Goswell");
      expect(result).toEqual([{ artist: "Rachel Goswell", band: "Slowdive", slug: "slowdive" }]);
    });

    it("maps two artists from the same band into two entries", async () => {
      const band = {
        name: "Slowdive",
        slug: "slowdive",
        personnel: ["Rachel Goswell", "Neil Halstead", "Nick Chaplin"],
      };
      bandRepo.createQueryBuilder.mockReturnValue(makeQb([band]));
      const result = await service.resolveUsedBy("Rachel Goswell, Neil Halstead");
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { artist: "Rachel Goswell", band: "Slowdive", slug: "slowdive" },
          { artist: "Neil Halstead", band: "Slowdive", slug: "slowdive" },
        ]),
      );
    });

    it("maps artists from different bands into separate entries", async () => {
      const slowdive = {
        name: "Slowdive",
        slug: "slowdive",
        personnel: ["Rachel Goswell", "Neil Halstead"],
      };
      const mbv = {
        name: "My Bloody Valentine",
        slug: "my-bloody-valentine",
        personnel: ["Kevin Shields", "Bilinda Butcher"],
      };
      bandRepo.createQueryBuilder.mockReturnValue(makeQb([slowdive, mbv]));
      const result = await service.resolveUsedBy("Rachel Goswell, Kevin Shields");
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { artist: "Rachel Goswell", band: "Slowdive", slug: "slowdive" },
          { artist: "Kevin Shields", band: "My Bloody Valentine", slug: "my-bloody-valentine" },
        ]),
      );
    });

    it("only includes artists present in the input, not all band personnel", async () => {
      const band = {
        name: "Slowdive",
        slug: "slowdive",
        personnel: ["Rachel Goswell", "Neil Halstead", "Nick Chaplin"],
      };
      bandRepo.createQueryBuilder.mockReturnValue(makeQb([band]));
      const result = await service.resolveUsedBy("Rachel Goswell");
      const artists = result.map((r) => r.artist);
      expect(artists).not.toContain("Neil Halstead");
      expect(artists).not.toContain("Nick Chaplin");
    });

    it("trims whitespace from individual artist names before matching", async () => {
      const band = {
        name: "Slowdive",
        slug: "slowdive",
        personnel: ["Rachel Goswell"],
      };
      bandRepo.createQueryBuilder.mockReturnValue(makeQb([band]));
      const result = await service.resolveUsedBy("  Rachel Goswell  ");
      expect(result).toHaveLength(1);
      expect(result[0].artist).toBe("Rachel Goswell");
    });

    it("passes the trimmed artist array to the query builder condition", async () => {
      const qb = makeQb([]);
      bandRepo.createQueryBuilder.mockReturnValue(qb);
      await service.resolveUsedBy("Rachel Goswell, Neil Halstead");
      expect(qb.where).toHaveBeenCalledWith("band.personnel && ARRAY[:...artists]::text[]", {
        artists: ["Rachel Goswell", "Neil Halstead"],
      });
    });

    it("selects only name, slug and personnel columns", async () => {
      const qb = makeQb([]);
      bandRepo.createQueryBuilder.mockReturnValue(qb);
      await service.resolveUsedBy("Rachel Goswell");
      expect(qb.select).toHaveBeenCalledWith(["band.name", "band.slug", "band.personnel"]);
    });
  });
});
