import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { TagsService } from "./tags.service";
import { Band } from "../entities/band.entity";

describe("TagsService", () => {
  describe("getTagsList", () => {
    let service: TagsService;
    let bandRepo: { query: jest.Mock };

    beforeEach(async () => {
      bandRepo = { query: jest.fn() };
      const moduleRef = await Test.createTestingModule({
        providers: [TagsService, { provide: getRepositoryToken(Band), useValue: bandRepo }],
      }).compile();
      service = moduleRef.get(TagsService);
    });

    it("returns tags ordered by count descending", async () => {
      bandRepo.query.mockResolvedValue([
        { name: "Ethereal", count: "5" },
        { name: "Female Vox", count: "3" },
        { name: "Nineties", count: "1" },
      ]);

      const result = await service.getTagsList();

      expect(result).toEqual([
        { name: "Ethereal", count: 5 },
        { name: "Female Vox", count: 3 },
        { name: "Nineties", count: 1 },
      ]);
    });

    it("returns empty array when no tags exist", async () => {
      bandRepo.query.mockResolvedValue([]);

      const result = await service.getTagsList();

      expect(result).toEqual([]);
    });

    it("casts count strings from raw SQL to numbers", async () => {
      bandRepo.query.mockResolvedValue([{ name: "Heavy", count: "2" }]);

      const result = await service.getTagsList();

      expect(typeof result[0].count).toBe("number");
      expect(result[0].count).toBe(2);
    });
  });

  describe("getBandsByTag", () => {
    let service: TagsService;
    let bandRepo: { createQueryBuilder: jest.Mock };

    const makeQb = (results: Partial<Band>[]) => ({
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(results),
    });

    beforeEach(async () => {
      bandRepo = { createQueryBuilder: jest.fn() };
      const moduleRef = await Test.createTestingModule({
        providers: [TagsService, { provide: getRepositoryToken(Band), useValue: bandRepo }],
      }).compile();
      service = moduleRef.get(TagsService);
    });

    it("returns all bands with tags when no tag param is given", async () => {
      const bands = [
        { id: "1", name: "Slowdive", tags: ["Ethereal"] },
        { id: "2", name: "Ride", tags: ["Male Vox"] },
      ];
      const qb = makeQb(bands);
      bandRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBandsByTag();

      expect(result).toHaveLength(2);
      expect(qb.where).toHaveBeenCalledWith("array_length(b.tags, 1) > 0");
    });

    it("returns only bands matching the given tag", async () => {
      const bands = [{ id: "1", name: "Slowdive", tags: ["Ethereal"] }];
      const qb = makeQb(bands);
      bandRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBandsByTag("Ethereal");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Slowdive");
      expect(qb.where).toHaveBeenCalledWith(":tag = ANY(b.tags)", {
        tag: "Ethereal",
      });
    });

    it("returns empty array when tag matches nothing", async () => {
      const qb = makeQb([]);
      bandRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBandsByTag("Nonexistent");

      expect(result).toEqual([]);
    });
  });
});
