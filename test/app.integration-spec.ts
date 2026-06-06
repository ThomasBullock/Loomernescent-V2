import request from 'supertest';
import { createTestApp, TestAppHandle } from './helpers/test-app';

describe('App smoke (integration)', () => {
  let handle: TestAppHandle;

  beforeAll(async () => {
    handle = await createTestApp();
  });

  afterAll(async () => {
    await handle.app.close();
  });

  it('renders the login page', async () => {
    const res = await request(handle.app.getHttpServer())
      .get('/auth/login')
      .expect(200);
    expect(res.text).toContain('<form');
  });
});
