import request from 'supertest';
import { createTestApp, truncate, TestAppHandle } from './helpers/test-app';
import { createUser, loginAs } from './helpers/auth';
import { Pedal } from '../src/entities/pedal.entity';

describe('Pedals CRUD (e2e)', () => {
  let handle: TestAppHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.app.close();
  });

  beforeEach(async () => {
    await truncate(handle.dataSource, 'pedals', 'users');
  });

  describe('GET /pedals/new', () => {
    it('redirects anonymous users to /auth/login', async () => {
      const res = await request(handle.app.getHttpServer()).get('/pedals/new');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/login');
    });

    it('returns 403 for non-admin users', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get('/pedals/new');
      expect(res.status).toBe(403);
    });

    it('renders the add-pedal form for admins', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get('/pedals/new');
      expect(res.status).toBe(200);
      expect(res.text).toContain('name="brand"');
      expect(res.text).toContain('name="name"');
      expect(res.text).toMatch(/action="\/pedals"/);
    });
  });

  describe('POST /pedals', () => {
    it('redirects anonymous users to /auth/login', async () => {
      const res = await request(handle.app.getHttpServer())
        .post('/pedals')
        .type('form')
        .send({ brand: 'Big Muff', name: 'Pi' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/login');
    });

    it('returns 403 for non-admin users', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post('/pedals')
        .type('form')
        .send({ brand: 'Big Muff', name: 'Pi' });
      expect(res.status).toBe(403);
    });

    it('re-renders form with error when brand is missing', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post('/pedals')
        .type('form')
        .send({ brand: '', name: 'Pi' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('Brand is required');
      expect(res.text).toContain('name="brand"');
    });

    it('creates a pedal and redirects to the detail page', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post('/pedals').type('form').send({
        brand: 'Big Muff',
        name: 'Pi',
        pedalType: 'Fuzz',
        pedalType2: 'None',
        yearsManufactured: '1969, 1970',
        youtube: 'https://www.youtube.com/watch?v=abc',
        comments: 'A classic',
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/pedal/big-muff-pi');

      const row = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { slug: 'big-muff-pi' } });
      expect(row).toBeTruthy();
      expect(row!.brand).toBe('Big Muff');
      expect(row!.name).toBe('Pi');
      expect(row!.pedalType).toBe('Fuzz');
      expect(row!.pedalType2).toBeNull();
      expect(row!.yearsManufactured).toHaveLength(2);
      expect(row!.comments).toBe('A classic');
    });

    it('re-renders form when slug already exists', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      await agent
        .post('/pedals')
        .type('form')
        .send({ brand: 'Dup', name: 'Pedal' });
      const res = await agent
        .post('/pedals')
        .type('form')
        .send({ brand: 'Dup', name: 'Pedal' });
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/already exists/i);
    });
  });

  describe('GET /pedals/:id/edit', () => {
    const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

    it('redirects anonymous users to /auth/login', async () => {
      const res = await request(handle.app.getHttpServer()).get(
        `/pedals/${VALID_UUID}/edit`,
      );
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/login');
    });

    it('returns 403 for non-admin users', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get(`/pedals/${VALID_UUID}/edit`);
      expect(res.status).toBe(403);
    });

    it('returns 404 when the pedal does not exist', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.get(`/pedals/${VALID_UUID}/edit`);
      expect(res.status).toBe(404);
    });

    it('renders the edit form with values prefilled', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await handle.dataSource.getRepository(Pedal).save({
        brand: 'Big Muff',
        name: 'Pi',
        slug: 'big-muff-pi',
        pedalType: 'Fuzz',
        yearsManufactured: [new Date('1969-01-01T00:00:00Z')],
        comments: 'A classic',
      } as Pedal);
      const res = await agent.get(`/pedals/${pedal.id}/edit`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('value="Big Muff"');
      expect(res.text).toContain('value="Pi"');
      expect(res.text).toMatch(
        new RegExp(`action="/pedals/${pedal.id}"`.replace(/\//g, '\\/')),
      );
    });
  });

  describe('POST /pedals/:id', () => {
    const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

    async function seedPedal(): Promise<Pedal> {
      return handle.dataSource.getRepository(Pedal).save({
        brand: 'Big Muff',
        name: 'Pi',
        slug: 'big-muff-pi',
        pedalType: 'Fuzz',
        yearsManufactured: [new Date('1969-01-01T00:00:00Z')],
        comments: 'original',
      } as Pedal);
    }

    it('redirects anonymous users to /auth/login', async () => {
      const res = await request(handle.app.getHttpServer())
        .post(`/pedals/${VALID_UUID}`)
        .type('form')
        .send({ brand: 'X', name: 'Y' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/login');
    });

    it('returns 403 for non-admin users', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post(`/pedals/${VALID_UUID}`)
        .type('form')
        .send({ brand: 'X', name: 'Y' });
      expect(res.status).toBe(403);
    });

    it('returns 404 when the pedal does not exist', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent
        .post(`/pedals/${VALID_UUID}`)
        .type('form')
        .send({ brand: 'X', name: 'Y' });
      expect(res.status).toBe(404);
    });

    it('re-renders the edit form when brand is missing', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await seedPedal();
      const res = await agent
        .post(`/pedals/${pedal.id}`)
        .type('form')
        .send({ brand: '', name: 'Pi' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('Brand is required');
      expect(res.text).toMatch(
        new RegExp(`action="/pedals/${pedal.id}"`.replace(/\//g, '\\/')),
      );
    });

    it('updates the pedal and redirects to the detail page', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await seedPedal();
      const res = await agent.post(`/pedals/${pedal.id}`).type('form').send({
        brand: 'Big Muff',
        name: 'Deluxe',
        pedalType: 'Fuzz',
        pedalType2: 'None',
        yearsManufactured: '1973',
        comments: 'updated',
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/pedal/big-muff-deluxe');

      const updated = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { id: pedal.id } });
      expect(updated!.name).toBe('Deluxe');
      expect(updated!.slug).toBe('big-muff-deluxe');
      expect(updated!.comments).toBe('updated');
    });

    it('keeps the slug when brand and name are unchanged', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await seedPedal();
      const res = await agent.post(`/pedals/${pedal.id}`).type('form').send({
        brand: 'Big Muff',
        name: 'Pi',
        comments: 'just edited the comment',
      });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/pedal/big-muff-pi');

      const updated = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { id: pedal.id } });
      expect(updated!.slug).toBe('big-muff-pi');
      expect(updated!.comments).toBe('just edited the comment');
    });
  });

  describe('POST /pedals/:id/delete', () => {
    const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

    async function seedPedal(): Promise<Pedal> {
      return handle.dataSource.getRepository(Pedal).save({
        brand: 'Big Muff',
        name: 'Pi',
        slug: 'big-muff-pi',
        yearsManufactured: [],
      } as Pedal);
    }

    it('redirects anonymous users to /auth/login', async () => {
      const res = await request(handle.app.getHttpServer()).post(
        `/pedals/${VALID_UUID}/delete`,
      );
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/login');
    });

    it('returns 403 for non-admin users', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: false,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/pedals/${VALID_UUID}/delete`);
      expect(res.status).toBe(403);
    });

    it('returns 404 when pedal does not exist', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const res = await agent.post(`/pedals/${VALID_UUID}/delete`);
      expect(res.status).toBe(404);
    });

    it('deletes the pedal and redirects to /pedals', async () => {
      const { user, password } = await createUser(handle.dataSource, {
        admin: true,
      });
      const agent = await loginAs(handle.app, user.email, password);
      const pedal = await seedPedal();
      const res = await agent.post(`/pedals/${pedal.id}/delete`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/pedals');

      const row = await handle.dataSource
        .getRepository(Pedal)
        .findOne({ where: { id: pedal.id } });
      expect(row).toBeNull();
    });
  });
});
