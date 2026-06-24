import request from "supertest";
import { createTestApp, truncate, TestAppHandle } from "./helpers/test-app";
import { createUser, loginAs } from "./helpers/auth";
import { Band } from "../src/entities/band.entity";
import { Album } from "../src/entities/album.entity";
import { Pedal } from "../src/entities/pedal.entity";
import { Favourite } from "../src/entities/favourite.entity";

describe("Favourites (integration)", () => {
  let handle: TestAppHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.app.close();
  });

  beforeEach(async () => {
    await truncate(handle.dataSource, "favourites", "bands", "albums", "pedals", "users");
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async function seedBand(authorId: string): Promise<Band> {
    return handle.dataSource.getRepository(Band).save({
      name: "Slowdive",
      slug: "slowdive",
      authorId,
    });
  }

  async function seedAlbum(bandId: string): Promise<Album> {
    return handle.dataSource.getRepository(Album).save({
      title: "Souvlaki",
      slug: "souvlaki",
      artist: "Slowdive",
      bandId,
    });
  }

  async function seedPedal(): Promise<Pedal> {
    return handle.dataSource.getRepository(Pedal).save({
      brand: "Electro-Harmonix",
      name: "Big Muff",
      slug: "electro-harmonix-big-muff",
    });
  }

  // ---------------------------------------------------------------------------
  // GET /favourites
  // ---------------------------------------------------------------------------

  describe("GET /favourites", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer()).get("/favourites");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("renders the favourites page for authenticated users", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const agent = await loginAs(handle.app, user.email, password);

      const res = await agent.get("/favourites");

      expect(res.status).toBe(200);
      expect(res.text).toContain("My Favourites");
      expect(res.text).toContain("Favourite Bands");
      expect(res.text).toContain("Favourite Albums");
      expect(res.text).toContain("Favourite Pedals");
    });

    it("renders favourited items on the page", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const band = await seedBand(user.id);
      const album = await seedAlbum(band.id);
      const pedal = await seedPedal();

      await handle.dataSource.getRepository(Favourite).save([
        { userId: user.id, bandId: band.id },
        { userId: user.id, albumId: album.id },
        { userId: user.id, pedalId: pedal.id },
      ]);

      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get("/favourites");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Slowdive");
      expect(res.text).toContain("Souvlaki");
      expect(res.text).toContain("Big Muff");
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/bands/:id/loves
  // ---------------------------------------------------------------------------

  describe("POST /api/v1/bands/:id/loves", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer())
        .post("/api/v1/bands/band-uuid/loves")
        .type("form");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("creates a favourite when band is not yet favourited", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const band = await seedBand(user.id);
      const agent = await loginAs(handle.app, user.email, password);

      const res = await agent.post(`/api/v1/bands/${band.id}/loves`).type("form");

      expect(res.status).toBe(302);

      const fav = await handle.dataSource
        .getRepository(Favourite)
        .findOneBy({ userId: user.id, bandId: band.id });
      expect(fav).not.toBeNull();
    });

    it("removes the favourite when band is already favourited (toggle off)", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const band = await seedBand(user.id);
      await handle.dataSource.getRepository(Favourite).save({ userId: user.id, bandId: band.id });

      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/api/v1/bands/${band.id}/loves`).type("form");

      expect(res.status).toBe(302);

      const fav = await handle.dataSource
        .getRepository(Favourite)
        .findOneBy({ userId: user.id, bandId: band.id });
      expect(fav).toBeNull();
    });

    it("redirects to the referer header after toggling", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const band = await seedBand(user.id);
      const agent = await loginAs(handle.app, user.email, password);

      const res = await agent
        .post(`/api/v1/bands/${band.id}/loves`)
        .set("Referer", "/bands")
        .type("form");

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/bands");
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/albums/:id/loves
  // ---------------------------------------------------------------------------

  describe("POST /api/v1/albums/:id/loves", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer())
        .post("/api/v1/albums/album-uuid/loves")
        .type("form");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("creates a favourite when album is not yet favourited", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const band = await seedBand(user.id);
      const album = await seedAlbum(band.id);
      const agent = await loginAs(handle.app, user.email, password);

      const res = await agent.post(`/api/v1/albums/${album.id}/loves`).type("form");

      expect(res.status).toBe(302);

      const fav = await handle.dataSource
        .getRepository(Favourite)
        .findOneBy({ userId: user.id, albumId: album.id });
      expect(fav).not.toBeNull();
    });

    it("removes the favourite when album is already favourited (toggle off)", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const band = await seedBand(user.id);
      const album = await seedAlbum(band.id);
      await handle.dataSource.getRepository(Favourite).save({ userId: user.id, albumId: album.id });

      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/api/v1/albums/${album.id}/loves`).type("form");

      expect(res.status).toBe(302);

      const fav = await handle.dataSource
        .getRepository(Favourite)
        .findOneBy({ userId: user.id, albumId: album.id });
      expect(fav).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/pedals/:id/loves
  // ---------------------------------------------------------------------------

  describe("POST /api/v1/pedals/:id/loves", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer())
        .post("/api/v1/pedals/pedal-uuid/loves")
        .type("form");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("creates a favourite when pedal is not yet favourited", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const pedal = await seedPedal();
      const agent = await loginAs(handle.app, user.email, password);

      const res = await agent.post(`/api/v1/pedals/${pedal.id}/loves`).type("form");

      expect(res.status).toBe(302);

      const fav = await handle.dataSource
        .getRepository(Favourite)
        .findOneBy({ userId: user.id, pedalId: pedal.id });
      expect(fav).not.toBeNull();
    });

    it("removes the favourite when pedal is already favourited (toggle off)", async () => {
      const { user, password } = await createUser(handle.dataSource);
      const pedal = await seedPedal();
      await handle.dataSource.getRepository(Favourite).save({ userId: user.id, pedalId: pedal.id });

      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/api/v1/pedals/${pedal.id}/loves`).type("form");

      expect(res.status).toBe(302);

      const fav = await handle.dataSource
        .getRepository(Favourite)
        .findOneBy({ userId: user.id, pedalId: pedal.id });
      expect(fav).toBeNull();
    });
  });
});
