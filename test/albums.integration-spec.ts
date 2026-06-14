import request from "supertest";
import { createTestApp, truncate, TestAppHandle } from "./helpers/test-app";
import { createUser, loginAs } from "./helpers/auth";
import { Album } from "../src/entities/album.entity";
import { Band } from "../src/entities/band.entity";

describe("Albums delete (integration)", () => {
  let handle: TestAppHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.app.close();
  });

  beforeEach(async () => {
    await truncate(handle.dataSource, "albums", "bands", "users");
    handle.imageKit.delete.mockClear();
  });

  const seedAlbum = async (authorId: string, overrides: Partial<Album> = {}): Promise<Album> => {
    const bandRepo = handle.dataSource.getRepository(Band);
    const band = await bandRepo.save(
      bandRepo.create({ name: "Ride", slug: "ride", authorId }),
    );
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

      const row = await handle.dataSource
        .getRepository(Album)
        .findOne({ where: { id: album.id } });
      expect(row).toBeNull();
    });
  });
});
