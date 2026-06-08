import request from 'supertest';
import sharp from 'sharp';
import { createTestApp, truncate, TestAppHandle } from './helpers/test-app';
import { createUser, loginAs } from './helpers/auth';
import { Band } from '../src/entities/band.entity';

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

describe('Bands create (integration)', () => {
  let handle: TestAppHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.app.close();
  });

  beforeEach(async () => {
    await truncate(handle.dataSource, 'bands', 'users');
    handle.imageKit.upload.mockClear();
    handle.imageKit.delete.mockClear();
  });

  describe('GET /band/new', () => {
    it('redirects anonymous users to /auth/login', async () => {
      const res = await request(handle.app.getHttpServer()).get('/band/new');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/login');
    });

    it('returns 403 for non-admin users', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get('/band/new');
      expect(res.status).toBe(403);
    });

    it('renders the add-band form for admins', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get('/band/new');
      expect(res.status).toBe(200);
      expect(res.text).toContain('name="name"');
      expect(res.text).toMatch(/action="\/bands"/);
    });
  });

  describe('POST /bands', () => {
    it('redirects anonymous users to /auth/login', async () => {
      const res = await request(handle.app.getHttpServer())
        .post('/bands')
        .type('form')
        .send({ name: 'Slowdive' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/login');
    });

    it('returns 403 for non-admin users', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post('/bands')
        .type('form')
        .send({ name: 'Slowdive' });
      expect(res.status).toBe(403);
    });

    it('re-renders the form with an error when name is missing', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post('/bands').type('form').send({ name: '' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('Band name is required');
      expect(res.text).toContain('name="name"');
    });

    it('creates a band and redirects to the detail page', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post('/bands').type('form').send({
        name: 'My Bloody Valentine',
        description: 'Irish shoegaze pioneers',
        personnel: 'Kevin Shields, Bilinda Butcher',
        labels: 'Creation, Sire',
        yearsActive: '1984, 1997',
        locationAddress: 'Dublin, Ireland',
        youtubePl: 'https://www.youtube.com/embed/abc',
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/band/my-bloody-valentine');

      const row = await handle.dataSource
        .getRepository(Band)
        .findOne({ where: { slug: 'my-bloody-valentine' } });
      expect(row).toBeTruthy();
      expect(row!.name).toBe('My Bloody Valentine');
      expect(row!.description).toBe('Irish shoegaze pioneers');
      expect(row!.personnel).toEqual(['Kevin Shields', 'Bilinda Butcher']);
      expect(row!.labels).toEqual(['Creation', 'Sire']);
      expect(row!.yearsActive).toHaveLength(2);
      expect(row!.locationAddress).toBe('Dublin, Ireland');
      expect(row!.authorId).toBe(user.id);
    });

    it('re-renders the form when the slug already exists', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      await agent.post('/bands').type('form').send({ name: 'Ride' });
      const res = await agent.post('/bands').type('form').send({ name: 'Ride' });
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/already exists/i);
    });

    it('creates a band with no file: image columns are NULL', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post('/bands')
        .type('form')
        .send({ name: 'Lush' });
      expect(res.status).toBe(302);
      expect(handle.imageKit.upload).not.toHaveBeenCalled();

      const row = await handle.dataSource
        .getRepository(Band)
        .findOne({ where: { slug: 'lush' } });
      expect(row!.imageFileId).toBeNull();
      expect(row!.imagePath).toBeNull();
    });

    it('creates a band with a file: uploads once and persists fileId + filePath', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post('/bands')
        .field('name', 'Slowdive')
        .attach('image', await jpegFixture(), {
          filename: 'band.jpg',
          contentType: 'image/jpeg',
        });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/band/slowdive');
      expect(handle.imageKit.upload).toHaveBeenCalledTimes(1);
      expect(handle.imageKit.upload).toHaveBeenCalledWith(
        expect.objectContaining({ filenameHint: 'Slowdive', folder: 'bands' }),
      );

      const row = await handle.dataSource
        .getRepository(Band)
        .findOne({ where: { slug: 'slowdive' } });
      expect(row!.imageFileId).toBe('test-file-id');
      expect(row!.imagePath).toBe('/bands/Slowdive.jpg');
    });

    it('rejects an oversized file (>10 MB) with 413', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post('/bands')
        .field('name', 'Big File')
        .attach('image', Buffer.alloc(11 * 1024 * 1024), {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        });
      expect(res.status).toBe(413);
      expect(handle.imageKit.upload).not.toHaveBeenCalled();
    });

    it('rejects a non-image mimetype with 400', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post('/bands')
        .field('name', 'Text File')
        .attach('image', Buffer.from('just text'), {
          filename: 'note.txt',
          contentType: 'text/plain',
        });
      expect(res.status).toBe(400);
      expect(handle.imageKit.upload).not.toHaveBeenCalled();
    });
  });
});
