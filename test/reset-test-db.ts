import "dotenv/config";
import { DataSource } from "typeorm";
import { User, Band, Album, Pedal, Favourite } from "../src/entities";

async function resetTestDb(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is required.");
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL.");
  }
  const useSsl = process.env.DATABASE_SSL === "true" || /sslmode=require/.test(url);

  const ds = new DataSource({
    type: "postgres",
    url,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    entities: [User, Band, Album, Pedal, Favourite],
    migrations: ["src/migrations/*.ts"],
    synchronize: false,
  });

  await ds.initialize();
  await ds.query("DROP SCHEMA IF EXISTS public CASCADE");
  await ds.query("CREATE SCHEMA public");
  await ds.runMigrations();
  await ds.destroy();

  console.log("Test database reset and migrated.");
}

resetTestDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
