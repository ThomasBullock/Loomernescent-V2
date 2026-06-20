import request from "supertest";
import { createTestApp, truncate, TestAppHandle } from "./helpers/test-app";
import { createUser } from "./helpers/auth";
import { Band } from "../src/entities/band.entity";

describe("Map (integration)", () => {
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

  describe("GET /map", () => {
    it("returns 200 with the map container element", async () => {
      const res = await request(handle.app.getHttpServer()).get("/map");
      expect(res.status).toBe(200);
      expect(res.text).toContain('data-testid="map.page.map-container"');
    });

    it("renders the autocomplete search container", async () => {
      const res = await request(handle.app.getHttpServer()).get("/map");
      expect(res.status).toBe(200);
      expect(res.text).toContain('class="autocomplete"');
    });

    it("includes data-map-key attribute when GOOGLE_MAPS_KEY is set", async () => {
      const res = await request(handle.app.getHttpServer()).get("/map");
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/data-map-key="[^"]+"/);
    });
  });

  describe("GET /api/bands/map", () => {
    it("returns 200 with an empty array when no bands have location data", async () => {
      const { user } = await createUser(handle.dataSource);
      await handle.dataSource.getRepository(Band).save({
        name: "Slowdive",
        slug: "slowdive",
        authorId: user.id,
        gallery: [],
      });

      const res = await request(handle.app.getHttpServer()).get("/api/bands/map");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns bands that have both lat and lng populated", async () => {
      const { user } = await createUser(handle.dataSource);
      await handle.dataSource.getRepository(Band).save({
        name: "My Bloody Valentine",
        slug: "my-bloody-valentine",
        authorId: user.id,
        locationLat: 53.3498,
        locationLng: -6.2603,
        locationAddress: "Dublin, Ireland",
        gallery: [],
      });
      await handle.dataSource.getRepository(Band).save({
        name: "Ride",
        slug: "ride",
        authorId: user.id,
        gallery: [],
      });

      const res = await request(handle.app.getHttpServer()).get("/api/bands/map");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);

      const band = res.body[0] as {
        name: string;
        slug: string;
        locationLat: number;
        locationLng: number;
        locationAddress: string;
      };
      expect(band.name).toBe("My Bloody Valentine");
      expect(band.slug).toBe("my-bloody-valentine");
      expect(band.locationLat).toBeCloseTo(53.3498);
      expect(band.locationLng).toBeCloseTo(-6.2603);
      expect(band.locationAddress).toBe("Dublin, Ireland");
    });

    it("does not expose the full band entity on the map endpoint", async () => {
      const { user } = await createUser(handle.dataSource);
      await handle.dataSource.getRepository(Band).save({
        name: "Lush",
        slug: "lush",
        authorId: user.id,
        locationLat: 51.5074,
        locationLng: -0.1278,
        locationAddress: "London, UK",
        gallery: [],
      });

      const res = await request(handle.app.getHttpServer()).get("/api/bands/map");
      expect(res.status).toBe(200);
      expect(res.body[0]).not.toHaveProperty("authorId");
      expect(res.body[0]).not.toHaveProperty("gallery");
      expect(res.body[0]).not.toHaveProperty("personnel");
    });
  });
});
