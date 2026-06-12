import request from "supertest";
import sharp from "sharp";
import { createTestApp, truncate, TestAppHandle } from "./helpers/test-app";
import { createUser, loginAs } from "./helpers/auth";
import { Pedal } from "../src/entities/pedal.entity";

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

describe("Pedals CRUD (integration)", () => {
  let handle: TestAppHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.app.close();
  });

  beforeEach(async () => {
    await truncate(handle.dataSource, "pedals", "users");
    handle.imageKit.upload.mockClear();
    handle.imageKit.delete.mockClear();
  });

  describe("GET /pedals/new", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer()).get("/pedals/new");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get("/pedals/new");
      expect(res.status).toBe(403);
    });

    it("renders the add-pedal form for admins", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get("/pedals/new");
      expect(res.status).toBe(200);
      expect(res.text).toContain('name="brand"');
      expect(res.text).toContain('name="name"');
      expect(res.text).toMatch(/action="\/pedals"/);
    });
  });

  describe("POST /pedals", () => {
    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer())
        .post("/pedals")
        .type("form")
        .send({ brand: "Big Muff", name: "Pi" });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post("/pedals").type("form").send({ brand: "Big Muff", name: "Pi" });
      expect(res.status).toBe(403);
    });

    it("re-renders form with error when brand is missing", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post("/pedals").type("form").send({ brand: "", name: "Pi" });
      expect(res.status).toBe(200);
      expect(res.text).toContain("Brand is required");
      expect(res.text).toContain('name="brand"');
    });

    it("creates a pedal and redirects to the detail page", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post("/pedals").type("form").send({
        brand: "Big Muff",
        name: "Pi",
        pedalType: "Fuzz",
        pedalType2: "None",
        yearsManufactured: "1969, 1970",
        youtube: "https://www.youtube.com/watch?v=abc",
        comments: "A classic",
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/pedal/big-muff-pi");

      const row = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { slug: "big-muff-pi" } });
      expect(row).toBeTruthy();
      expect(row!.brand).toBe("Big Muff");
      expect(row!.name).toBe("Pi");
      expect(row!.pedalType).toBe("Fuzz");
      expect(row!.pedalType2).toBeNull();
      expect(row!.yearsManufactured).toHaveLength(2);
      expect(row!.comments).toBe("A classic");
    });

    it("re-renders form when slug already exists", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      await agent.post("/pedals").type("form").send({ brand: "Dup", name: "Pedal" });
      const res = await agent.post("/pedals").type("form").send({ brand: "Dup", name: "Pedal" });
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/already exists/i);
    });

    it("creates a pedal with no file: image columns are NULL", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post("/pedals").type("form").send({ brand: "No", name: "Image" });
      expect(res.status).toBe(302);
      expect(handle.imageKit.upload).not.toHaveBeenCalled();

      const row = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { slug: "no-image" } });
      expect(row!.imageFileId).toBeNull();
      expect(row!.imagePath).toBeNull();
    });

    it("creates a pedal with a file: uploads once and persists fileId + filePath", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post("/pedals")
        .field("brand", "Boss")
        .field("name", "DS1")
        .attach("image", await jpegFixture(), {
          filename: "pedal.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/pedal/boss-ds1");
      expect(handle.imageKit.upload).toHaveBeenCalledTimes(1);
      expect(handle.imageKit.upload).toHaveBeenCalledWith(
        expect.objectContaining({ filenameHint: "Boss-DS1", folder: "pedals" }),
      );

      const row = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { slug: "boss-ds1" } });
      expect(row!.imageFileId).toBe("test-file-id");
      expect(row!.imagePath).toBe("/pedals/Boss-DS1.jpg");
    });

    it("rejects an oversized file (>10 MB) with 413", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post("/pedals")
        .field("brand", "Big")
        .field("name", "File")
        .attach("image", Buffer.alloc(11 * 1024 * 1024), {
          filename: "big.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(413);
      expect(handle.imageKit.upload).not.toHaveBeenCalled();
    });

    it("rejects a non-image mimetype with 400", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post("/pedals")
        .field("brand", "Text")
        .field("name", "File")
        .attach("image", Buffer.from("just text"), {
          filename: "note.txt",
          contentType: "text/plain",
        });
      expect(res.status).toBe(400);
      expect(handle.imageKit.upload).not.toHaveBeenCalled();
    });
  });

  describe("GET /pedals/:id/edit", () => {
    const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer()).get(`/pedals/${VALID_UUID}/edit`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get(`/pedals/${VALID_UUID}/edit`);
      expect(res.status).toBe(403);
    });

    it("returns 404 when the pedal does not exist", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get(`/pedals/${VALID_UUID}/edit`);
      expect(res.status).toBe(404);
    });

    it("renders the edit form with values prefilled", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await handle.dataSource.getRepository(Pedal).save({
        brand: "Big Muff",
        name: "Pi",
        slug: "big-muff-pi",
        pedalType: "Fuzz",
        yearsManufactured: [new Date("1969-01-01T00:00:00Z")],
        comments: "A classic",
      });
      const res = await agent.get(`/pedals/${pedal.id}/edit`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('value="Big Muff"');
      expect(res.text).toContain('value="Pi"');
      expect(res.text).toMatch(new RegExp(`action="/pedals/${pedal.id}"`.replace(/\//g, "\\/")));
    });
  });

  describe("POST /pedals/:id", () => {
    const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

    async function seedPedal(): Promise<Pedal> {
      return handle.dataSource.getRepository(Pedal).save({
        brand: "Big Muff",
        name: "Pi",
        slug: "big-muff-pi",
        pedalType: "Fuzz",
        yearsManufactured: [new Date("1969-01-01T00:00:00Z")],
        comments: "original",
      });
    }

    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer())
        .post(`/pedals/${VALID_UUID}`)
        .type("form")
        .send({ brand: "X", name: "Y" });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post(`/pedals/${VALID_UUID}`)
        .type("form")
        .send({ brand: "X", name: "Y" });
      expect(res.status).toBe(403);
    });

    it("returns 404 when the pedal does not exist", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post(`/pedals/${VALID_UUID}`)
        .type("form")
        .send({ brand: "X", name: "Y" });
      expect(res.status).toBe(404);
    });

    it("re-renders the edit form when brand is missing", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await seedPedal();
      const res = await agent
        .post(`/pedals/${pedal.id}`)
        .type("form")
        .send({ brand: "", name: "Pi" });
      expect(res.status).toBe(200);
      expect(res.text).toContain("Brand is required");
      expect(res.text).toMatch(new RegExp(`action="/pedals/${pedal.id}"`.replace(/\//g, "\\/")));
    });

    it("updates the pedal and redirects to the detail page", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await seedPedal();
      const res = await agent.post(`/pedals/${pedal.id}`).type("form").send({
        brand: "Big Muff",
        name: "Deluxe",
        pedalType: "Fuzz",
        pedalType2: "None",
        yearsManufactured: "1973",
        comments: "updated",
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/pedal/big-muff-deluxe");

      const updated = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { id: pedal.id } });
      expect(updated!.name).toBe("Deluxe");
      expect(updated!.slug).toBe("big-muff-deluxe");
      expect(updated!.comments).toBe("updated");
    });

    it("keeps the slug when brand and name are unchanged", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await seedPedal();
      const res = await agent.post(`/pedals/${pedal.id}`).type("form").send({
        brand: "Big Muff",
        name: "Pi",
        comments: "just edited the comment",
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/pedal/big-muff-pi");

      const updated = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { id: pedal.id } });
      expect(updated!.slug).toBe("big-muff-pi");
      expect(updated!.comments).toBe("just edited the comment");
    });

    it("replaces the image with a new file and deletes the old one", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await handle.dataSource.getRepository(Pedal).save({
        brand: "Big Muff",
        name: "Pi",
        slug: "big-muff-pi",
        yearsManufactured: [],
        imageFileId: "old-file-id",
        imagePath: "/pedals/old.jpg",
      });

      const res = await agent
        .post(`/pedals/${pedal.id}`)
        .field("brand", "Big Muff")
        .field("name", "Pi")
        .attach("image", await jpegFixture(), {
          filename: "new.jpg",
          contentType: "image/jpeg",
        });
      expect(res.status).toBe(302);
      expect(handle.imageKit.upload).toHaveBeenCalledTimes(1);
      expect(handle.imageKit.delete).toHaveBeenCalledWith("old-file-id");

      const updated = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { id: pedal.id } });
      expect(updated!.imageFileId).toBe("test-file-id");
      expect(updated!.imagePath).toBe("/pedals/Big Muff-Pi.jpg");
    });

    it("leaves the existing image intact when no file is uploaded", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await handle.dataSource.getRepository(Pedal).save({
        brand: "Big Muff",
        name: "Pi",
        slug: "big-muff-pi",
        yearsManufactured: [],
        imageFileId: "keep-file-id",
        imagePath: "/pedals/keep.jpg",
      });

      const res = await agent
        .post(`/pedals/${pedal.id}`)
        .type("form")
        .send({ brand: "Big Muff", name: "Pi", comments: "no new image" });
      expect(res.status).toBe(302);
      expect(handle.imageKit.upload).not.toHaveBeenCalled();
      expect(handle.imageKit.delete).not.toHaveBeenCalled();

      const updated = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { id: pedal.id } });
      expect(updated!.imageFileId).toBe("keep-file-id");
      expect(updated!.imagePath).toBe("/pedals/keep.jpg");
    });
  });

  describe("POST /pedals/:id/delete", () => {
    const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

    async function seedPedal(): Promise<Pedal> {
      return handle.dataSource.getRepository(Pedal).save({
        brand: "Big Muff",
        name: "Pi",
        slug: "big-muff-pi",
        yearsManufactured: [],
      });
    }

    it("redirects anonymous users to /auth/login", async () => {
      const res = await request(handle.app.getHttpServer()).post(`/pedals/${VALID_UUID}/delete`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/auth/login");
    });

    it("returns 403 for non-admin users", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/pedals/${VALID_UUID}/delete`);
      expect(res.status).toBe(403);
    });

    it("returns 404 when pedal does not exist", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/pedals/${VALID_UUID}/delete`);
      expect(res.status).toBe(404);
    });

    it("deletes the pedal and redirects to /pedals", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await seedPedal();
      const res = await agent.post(`/pedals/${pedal.id}/delete`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/pedals");

      const row = await handle.dataSource.getRepository(Pedal).findOne({ where: { id: pedal.id } });
      expect(row).toBeNull();
    });

    it("deletes the ImageKit asset when one is set", async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await handle.dataSource.getRepository(Pedal).save({
        brand: "Big Muff",
        name: "Pi",
        slug: "big-muff-pi",
        yearsManufactured: [],
        imageFileId: "del-file-id",
        imagePath: "/pedals/del.jpg",
      });

      const res = await agent.post(`/pedals/${pedal.id}/delete`);
      expect(res.status).toBe(302);
      expect(handle.imageKit.delete).toHaveBeenCalledWith("del-file-id");
    });
  });
});
