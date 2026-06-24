import "dotenv/config";
import bcrypt from "bcrypt";
import { DataSource } from "typeorm";

let _ds: DataSource | null = null;

export async function getTestDataSource(): Promise<DataSource> {
  if (_ds?.isInitialized) return _ds;

  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is required");

  const useSsl = process.env.DATABASE_SSL === "true" || /sslmode=require/.test(url);

  _ds = new DataSource({
    type: "postgres",
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

export async function truncateTables(ds: DataSource, ...tables: string[]): Promise<void> {
  if (tables.length === 0) return;
  const quoted = tables.map((t) => `"${t}"`).join(", ");
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

export interface CreatePedalOptions {
  brand?: string;
  name?: string;
  slug?: string;
}

export interface CreatedPedal {
  id: string;
  brand: string;
  name: string;
  slug: string;
}

let counter = 0;

export async function createPedal(
  ds: DataSource,
  opts: CreatePedalOptions = {},
): Promise<CreatedPedal> {
  counter += 1;
  const brand = opts.brand ?? `E2E Brand ${counter}`;
  const name = opts.name ?? `E2E Pedal ${counter}`;
  const slug = opts.slug ?? `e2e-brand-${counter}-e2e-pedal-${counter}`;

  const rows = await ds.query<CreatedPedal[]>(
    `INSERT INTO "pedals" (brand, name, slug)
     VALUES ($1, $2, $3)
     RETURNING id, brand, name, slug`,
    [brand, name, slug],
  );

  return rows[0];
}

export interface CreateBandOptions {
  name?: string;
  slug?: string;
  authorId?: string;
}

export interface CreatedBand {
  id: string;
  name: string;
  slug: string;
}

export async function createBand(
  ds: DataSource,
  opts: CreateBandOptions = {},
): Promise<CreatedBand> {
  counter += 1;
  const name = opts.name ?? `E2E Band ${counter}`;
  const slug = opts.slug ?? `e2e-band-${counter}`;

  let authorId = opts.authorId;
  if (!authorId) {
    const { user } = await createUser(ds);
    authorId = user.id;
  }

  const rows = await ds.query<CreatedBand[]>(
    `INSERT INTO "bands" (name, slug, author_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, slug`,
    [name, slug, authorId],
  );

  return rows[0];
}

export interface CreateAlbumOptions {
  title?: string;
  slug?: string;
  artist?: string;
  bandId?: string;
}

export interface CreatedAlbum {
  id: string;
  title: string;
  slug: string;
  artist: string;
  band_id: string;
}

export async function createAlbum(
  ds: DataSource,
  opts: CreateAlbumOptions = {},
): Promise<CreatedAlbum> {
  counter += 1;
  const title = opts.title ?? `E2E Album ${counter}`;
  const slug = opts.slug ?? `e2e-album-${counter}`;
  const artist = opts.artist ?? `E2E Band ${counter}`;

  let bandId = opts.bandId;
  if (!bandId) {
    const band = await createBand(ds, { name: artist });
    bandId = band.id;
  }

  const rows = await ds.query<CreatedAlbum[]>(
    `INSERT INTO "albums" (title, slug, artist, band_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, slug, artist, band_id`,
    [title, slug, artist, bandId],
  );

  return rows[0];
}

export interface CreateFavouriteOptions {
  userId: string;
  bandId?: string;
  albumId?: string;
  pedalId?: string;
}

export interface CreatedFavourite {
  id: string;
  user_id: string;
}

export async function createFavourite(
  ds: DataSource,
  opts: CreateFavouriteOptions,
): Promise<CreatedFavourite> {
  const rows = await ds.query<CreatedFavourite[]>(
    `INSERT INTO "favourites" (user_id, band_id, album_id, pedal_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id`,
    [opts.userId, opts.bandId ?? null, opts.albumId ?? null, opts.pedalId ?? null],
  );
  return rows[0];
}

export async function createUser(
  ds: DataSource,
  opts: CreateUserOptions = {},
): Promise<CreatedUser> {
  const password = opts.password ?? "Password1!";
  const passwordHash = await bcrypt.hash(password, 10);
  counter += 1;
  const email = opts.email ?? `e2e-user-${Date.now()}-${counter}@example.test`;
  const name = opts.name ?? "E2E User";
  const admin = opts.admin ?? false;

  const rows = await ds.query<{ id: string; email: string; name: string }[]>(
    `INSERT INTO "users" (name, email, password_hash, admin)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name`,
    [name, email, passwordHash, admin],
  );

  return { user: rows[0], password };
}
