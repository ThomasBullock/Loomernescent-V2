import 'dotenv/config';
import { register } from 'ts-node';
import { DataSource } from 'typeorm';

register({ project: './tsconfig.json', transpileOnly: true });

export default async function globalSetup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required for Playwright e2e tests.');
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL.');
  }

  const useSsl =
    process.env.DATABASE_SSL === 'true' || /sslmode=require/.test(url);

  const ds = new DataSource({
    type: 'postgres',
    url,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    entities: [],
    migrations: ['src/migrations/*.ts'],
    synchronize: false,
  });

  await ds.initialize();
  await ds.runMigrations();
  await ds.destroy();
}
