import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User, Band, Album, Pedal, Favourite } from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [User, Band, Album, Pedal, Favourite],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
