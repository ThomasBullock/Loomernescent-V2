import request from "supertest";
import sharp from "sharp";
import { createTestApp, truncate, TestAppHandle } from "./helpers/test-app";
import { createUser, loginAs } from "./helpers/auth";
import { Album } from "../src/entities/album.entity";
import { Band } from "../src/entities/band.entity";

const jpegFixture = (): Promise<Buffer> =>
  sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .jpeg()
    .toBuffer();

describe("Albums (integration)", () => {
  let handle: TestAppHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.app.close();
  });

  beforeEach(async () => {
    await truncate(handle.dataSource, "albums", "bands", "users");
    handle.imageKit.upload.mockClear();
    handle.imageKit.delete.mockClear();
  });

  const seedBand = async (authorId: string): Promise<Band> => {
    const repo = handle.dataSource.getRepository(Band);
    return repo.save(repo.create({ name: "Ride", slug: "ride", authorId }));
  };

  const seedAlbum = async (authorId: string, overrides: Partial<Album> = {}): Promise<Album> => {
    const band = await seedBand(authorId);
    const albumRepo = handle.dataSource.getRepository(Album);
    return albumRepo.save(
      albumRepo.create({
        title: "Nowhere",
        slug: "nowhere",
        artist: "Ride",
        bandId: band.id,
        ...overrides,
      }),
    );
  };

  // ─── CREATE ────────────────────────────────────────────────────────────────

  describe("POST /albums", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer())
        .post("/albums")
        .type("form")
        .send({ title: "Nowhere", artist: "Ride" });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: false });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post("/albums")
        .type("form")
        .send({ title: "Nowhere", artist: "Ride" });
      expect(res.status).toBe(403);
    });

    it("re-renders the form with an error when title is missing", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post("/albums").type("form").send({ title: "", artist: "Ride" });
      expect(res.status).toBe(200);
      expect(res.text).toContain("Album title is required");
    });

    it("creates an album and redirects to the detail page", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      await seedBand(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post("/albums").type("form").send({
        title: "Nowhere",
        artist: "Ride",
        producer: "Alan Moulder",
        label: "Creation",
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/album/nowhere");

      const row = await handle.dataSource
        .getRepository(Album)
        .findOne({ where: { slug: "nowhere" } });
      expect(row).toBeTruthy();
      expect(row!.title).toBe("Nowhere");
      expect(row!.producer).toEqual(["Alan Moulder"]);
      expect(row!.label).toBe("Creation");
    });

    it("re-renders form with error when artist band does not exist", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post("/albums").type("form").send({
        title: "Nowhere",
        artist: "Unknown Band",
      });
      expect(res.status).toBe(200);
      expect(res.text).toContain("Artist not found");
    });

    it("creates with no file: image columns are NULL", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      await seedBand(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      await agent.post("/albums").type("form").send({ title: "Nowhere", artist: "Ride" });
      expect(handle.imageKit.upload).not.toHaveBeenCalled();

      const row = await handle.dataSource
        .getRepository(Album)
        .findOne({ where: { slug: "nowhere" } });
      expect(row!.imageFileId).toBeNull();
      expect(row!.imagePath).toBeNull();
    });

    it("uploads cover and persists fileId + imagePath", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      await seedBand(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post("/albums")
        .field("title", "Going Blank Again")
        .field("artist", "Ride")
        .attach("cover", await jpegFixture(), {
          filename: "cover.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(302);
      expect(handle.imageKit.upload).toHaveBeenCalledTimes(1);
      expect(handle.imageKit.upload).toHaveBeenCalledWith(
        expect.objectContaining({ folder: "albums" }),
      );

      const row = await handle.dataSource
        .getRepository(Album)
        .findOne({ where: { slug: "going-blank-again" } });
      expect(row!.imageFileId).toBe("test-file-id");
    });
  });

  // ─── EDIT FORM ─────────────────────────────────────────────────────────────

  describe("GET /albums/:id/edit", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const { user } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id);
      const res = await request(handle.app.getHttpServer()).get(`/albums/${album.id}/edit`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: false });
      const album = await seedAlbum(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get(`/albums/${album.id}/edit`);
      expect(res.status).toBe(403);
    });

    it("returns 404 for an unknown id", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get("/albums/00000000-0000-0000-0000-000000000000/edit");
      expect(res.status).toBe(404);
    });

    it("renders the edit form pre-filled for admins", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id, { title: "Nowhere", slug: "nowhere" });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get(`/albums/${album.id}/edit`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('value="Nowhere"');
      expect(res.text).toContain(`action="/albums/${album.id}"`);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────────────────

  describe("POST /albums/:id", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const { user } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id);
      const res = await request(handle.app.getHttpServer())
        .post(`/albums/${album.id}`)
        .type("form")
        .send({ title: "Nowhere", artist: "Ride" });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: false });
      const album = await seedAlbum(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post(`/albums/${album.id}`)
        .type("form")
        .send({ title: "Nowhere", artist: "Ride" });
      expect(res.status).toBe(403);
    });

    it("returns 404 for an unknown id", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post("/albums/00000000-0000-0000-0000-000000000000")
        .type("form")
        .send({ title: "Nowhere", artist: "Ride" });
      expect(res.status).toBe(404);
    });

    it("re-renders the edit form with an error when title is missing", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post(`/albums/${album.id}`)
        .type("form")
        .send({ title: "", artist: "Ride" });
      expect(res.status).toBe(200);
      expect(res.text).toContain("Album title is required");
      expect(res.text).toContain(`action="/albums/${album.id}"`);
    });

    it("updates fields and redirects to the detail page", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/albums/${album.id}`).type("form").send({
        title: "Nowhere",
        artist: "Ride",
        producer: "Alan Moulder, Flood",
        label: "Creation",
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/album/nowhere");

      const row = await handle.dataSource.getRepository(Album).findOne({ where: { id: album.id } });
      expect(row!.producer).toEqual(["Alan Moulder", "Flood"]);
      expect(row!.label).toBe("Creation");
    });

    it("re-renders form with error when artist is changed to an unknown band", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/albums/${album.id}`).type("form").send({
        title: "Nowhere",
        artist: "Unknown Band",
      });
      expect(res.status).toBe(200);
      expect(res.text).toContain("Artist not found");
    });

    it("recomputes the slug when the title changes", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id, { title: "Nowhere", slug: "nowhere" });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/albums/${album.id}`).type("form").send({
        title: "Going Blank Again",
        artist: "Ride",
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/album/going-blank-again");

      const row = await handle.dataSource.getRepository(Album).findOne({ where: { id: album.id } });
      expect(row!.slug).toBe("going-blank-again");
    });

    it("preserves the existing cover when no file is uploaded", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id, {
        imageFileId: "existing-id",
        imagePath: "/albums/existing.jpg",
      });
      const agent = await loginAs(handle.app, user.email, password);
      await agent
        .post(`/albums/${album.id}`)
        .type("form")
        .send({ title: "Nowhere", artist: "Ride" });
      expect(handle.imageKit.upload).not.toHaveBeenCalled();

      const row = await handle.dataSource.getRepository(Album).findOne({ where: { id: album.id } });
      expect(row!.imageFileId).toBe("existing-id");
      expect(row!.imagePath).toBe("/albums/existing.jpg");
    });

    it("uploads a new cover and deletes the old one when a file is supplied", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id, {
        title: "Nowhere",
        slug: "nowhere",
        imageFileId: "old-id",
        imagePath: "/albums/old.jpg",
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post(`/albums/${album.id}`)
        .field("title", "Nowhere")
        .field("artist", "Ride")
        .attach("cover", await jpegFixture(), {
          filename: "new.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(302);
      expect(handle.imageKit.upload).toHaveBeenCalledTimes(1);
      expect(handle.imageKit.delete).toHaveBeenCalledWith("old-id");

      const row = await handle.dataSource.getRepository(Album).findOne({ where: { id: album.id } });
      expect(row!.imageFileId).toBe("test-file-id");
    });
  });

  // ─── DELETE ────────────────────────────────────────────────────────────────

  describe("POST /albums/:id/delete", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const { user } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id);
      const res = await request(handle.app.getHttpServer()).post(`/albums/${album.id}/delete`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: false });
      const album = await seedAlbum(user.id);
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/albums/${album.id}/delete`);
      expect(res.status).toBe(403);
    });

    it("returns 404 for an unknown id", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post("/albums/00000000-0000-0000-0000-000000000000/delete");
      expect(res.status).toBe(404);
    });

    it("deletes the album and its cover image, then redirects to /albums", async () => {
      const { user, password } = await createUser(handle.dataSource, { admin: true });
      const album = await seedAlbum(user.id, {
        imageFileId: "cover-file-id",
        imagePath: "/albums/nowhere.jpg",
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/albums/${album.id}/delete`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/albums");
      expect(handle.imageKit.delete).toHaveBeenCalledWith("cover-file-id");

      const row = await handle.dataSource.getRepository(Album).findOne({ where: { id: album.id } });
      expect(row).toBeNull();
    });
  });
});
