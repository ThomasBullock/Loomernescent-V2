import request from "supertest";
import { createTestApp, truncate, TestAppHandle } from "./helpers/test-app";
import { createUser } from "./helpers/auth";
import { Band } from "../src/entities/band.entity";

describe("Tags (integration)", () => {
  let handle: TestAppHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.app.close();
  });

  beforeEach(async () => {
    await truncate(handle.dataSource, "bands", "users");
    handle.spotify.searchArtist.mockClear();
    handle.spotify.searchArtist.mockResolvedValue(null);
  });

  describe("GET /tags", () => {
    it("returns 200", async () => {
      const res = await request(handle.app.getHttpServer()).get("/tags");
      expect(res.status).toBe(200);
    });

    it("renders the tags-list testid", async () => {
      const res = await request(handle.app.getHttpServer()).get("/tags");
      expect(res.text).toContain('data-testid="tags.browse.tags-list"');
    });

    it("renders the bands-container testid", async () => {
      const res = await request(handle.app.getHttpServer()).get("/tags");
      expect(res.text).toContain('data-testid="tags.browse.bands-container"');
    });

    it("renders a tag name from a seeded band", async () => {
      const { user } = await createUser(handle.dataSource);
      await handle.dataSource.getRepository(Band).save({
        name: "Slowdive",
        slug: "slowdive",
        authorId: user.id,
        tags: ["Ethereal"],
        gallery: [],
      });

      const res = await request(handle.app.getHttpServer()).get("/tags");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Ethereal");
    });

    it("shows all bands that have at least one tag", async () => {
      const { user } = await createUser(handle.dataSource);
      await handle.dataSource.getRepository(Band).save({
        name: "Slowdive",
        slug: "slowdive",
        authorId: user.id,
        tags: ["Ethereal"],
        gallery: [],
      });
      await handle.dataSource.getRepository(Band).save({
        name: "Ride",
        slug: "ride",
        authorId: user.id,
        tags: [],
        gallery: [],
      });

      const res = await request(handle.app.getHttpServer()).get("/tags");
      expect(res.text).toContain("Slowdive");
      expect(res.text).not.toContain("Ride");
    });
  });

  describe("GET /tags/:tag", () => {
    it("returns 200", async () => {
      const res = await request(handle.app.getHttpServer()).get("/tags/Ethereal");
      expect(res.status).toBe(200);
    });

    it("renders only bands matching the given tag", async () => {
      const { user } = await createUser(handle.dataSource);
      await handle.dataSource.getRepository(Band).save({
        name: "Slowdive",
        slug: "slowdive",
        authorId: user.id,
        tags: ["Ethereal"],
        gallery: [],
      });
      await handle.dataSource.getRepository(Band).save({
        name: "Ringo Deathstarr",
        slug: "ringo-deathstarr",
        authorId: user.id,
        tags: ["Noughties"],
        gallery: [],
      });

      const res = await request(handle.app.getHttpServer()).get("/tags/Ethereal");
      expect(res.text).toContain("Slowdive");
      expect(res.text).not.toContain("Ringo Deathstarr");
    });

    it("marks the active tag link with the active class", async () => {
      const { user } = await createUser(handle.dataSource);
      await handle.dataSource.getRepository(Band).save({
        name: "Slowdive",
        slug: "slowdive",
        authorId: user.id,
        tags: ["Ethereal"],
        gallery: [],
      });

      const res = await request(handle.app.getHttpServer()).get("/tags/Ethereal");
      expect(res.text).toContain("tag__link--active");
    });

    it("returns empty band list when tag matches nothing", async () => {
      const res = await request(handle.app.getHttpServer()).get("/tags/Nonexistent");
      expect(res.status).toBe(200);
      expect(res.text).toContain('data-testid="tags.browse.bands-container"');
    });
  });
});
