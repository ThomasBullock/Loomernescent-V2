import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User, Band, Album, Pedal, Favourite } from './entities';
import { shouldUseSsl } from './configure-app';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
  entities: [User, Band, Album, Pedal, Favourite],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
