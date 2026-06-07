import 'dotenv/config';
import bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

let _ds: DataSource | null = null;

export async function getTestDataSource(): Promise<DataSource> {
  if (_ds?.isInitialized) return _ds;

  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is required');

  const useSsl =
    process.env.DATABASE_SSL === 'true' || /sslmode=require/.test(url);

  _ds = new DataSource({
    type: 'postgres',
    url,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    entities: [],
    synchronize: false,
  });

  await _ds.initialize();
  return _ds;
}

export async function closeTestDataSource(): Promise<void> {
  if (_ds?.isInitialized) {
    await _ds.destroy();
    _ds = null;
  }
}

export async function truncateTables(
  ds: DataSource,
  ...tables: string[]
): Promise<void> {
  if (tables.length === 0) return;
  const quoted = tables.map((t) => `"${t}"`).join(', ');
  await ds.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}

export interface CreateUserOptions {
  email?: string;
  password?: string;
  name?: string;
  admin?: boolean;
}

export interface CreatedUser {
  user: { id: string; email: string; name: string };
  password: string;
}

let counter = 0;

export async function createUser(
  ds: DataSource,
  opts: CreateUserOptions = {},
): Promise<CreatedUser> {
  const password = opts.password ?? 'Password1!';
  const passwordHash = await bcrypt.hash(password, 10);
  counter += 1;
  const email =
    opts.email ?? `e2e-user-${Date.now()}-${counter}@example.test`;
  const name = opts.name ?? 'E2E User';
  const admin = opts.admin ?? false;

  const rows = await ds.query<{ id: string; email: string; name: string }[]>(
    `INSERT INTO "users" (name, email, password_hash, admin)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name`,
    [name, email, passwordHash, admin],
  );

  return { user: rows[0], password };
}
