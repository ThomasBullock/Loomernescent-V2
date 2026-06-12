import "dotenv/config";
import { AppDataSource } from "../data-source";
import { User } from "../entities/user.entity";
import { Band } from "../entities/band.entity";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_AUTHOR_EMAIL = "motbollox@gmail.com";

/** Shape of a row exported from Neon (snake_case column names). */
interface BandRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  labels: string[];
  personnel: string[];
  past_personnel: string[];
  tags: string[];
  years_active: string[];
  created: string;
  location_address: string | null;
  location_lng: number | null;
  location_lat: number | null;
  image_file_id: string | null;
  image_path: string | null;
  gallery: { fileId: string; filePath: string }[];
  youtube_pl: string | null;
  vimeo_pl: string | null;
  spotify_id: string | null;
  spotify_url: string | null;
}

async function seedContent(): Promise<void> {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const bandRepo = AppDataSource.getRepository(Band);

  const authorEmail = process.env.SEED_AUTHOR_EMAIL ?? DEFAULT_AUTHOR_EMAIL;
  const author = await userRepo.findOneBy({ email: authorEmail });

  if (!author) {
    console.error(`Author user not found: ${authorEmail}. Run seed:accounts first.`);
    process.exit(1);
  }

  const records: BandRecord[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data", "bands.json"), "utf-8"),
  ) as BandRecord[];

  console.log(`Seeding ${records.length} band(s)...`);

  for (const r of records) {
    await bandRepo
      .createQueryBuilder()
      .insert()
      .into(Band)
      .values({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description ?? undefined,
        labels: r.labels,
        personnel: r.personnel,
        pastPersonnel: r.past_personnel,
        tags: r.tags,
        yearsActive: r.years_active.map((d) => new Date(d)),
        created: new Date(r.created),
        locationAddress: r.location_address ?? undefined,
        locationLng: r.location_lng ?? undefined,
        locationLat: r.location_lat ?? undefined,
        imageFileId: r.image_file_id ?? undefined,
        imagePath: r.image_path ?? undefined,
        gallery: r.gallery,
        youtubePl: r.youtube_pl ?? undefined,
        vimeoPl: r.vimeo_pl ?? undefined,
        spotifyId: r.spotify_id ?? undefined,
        spotifyUrl: r.spotify_url ?? undefined,
        authorId: author.id,
      })
      .orIgnore()
      .execute();

    console.log(`  ${r.name} (${r.slug}) — inserted or already exists`);
  }

  await AppDataSource.destroy();
  console.log("Content seeding complete.");
}

seedContent().catch((err) => {
  console.error("Content seeding failed:", err);
  process.exit(1);
});
