/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import "dotenv/config";
import { AppDataSource } from "../data-source";
import { User } from "../entities/user.entity";
import { Band } from "../entities/band.entity";
import { Album } from "../entities/album.entity";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const legacyDataDir = path.join(__dirname, "..", "..", "..", "loomernescent", "data");
async function seed() {
  await AppDataSource.initialize();
  console.log("Connected to database");

  const userRepo = AppDataSource.getRepository(User);
  const bandRepo = AppDataSource.getRepository(Band);
  const albumRepo = AppDataSource.getRepository(Album);

  const legacyUsers = JSON.parse(fs.readFileSync(path.join(legacyDataDir, "users.json"), "utf-8"));
  const legacyBands = JSON.parse(fs.readFileSync(path.join(legacyDataDir, "bands.json"), "utf-8"));
  const legacyAlbums = JSON.parse(
    fs.readFileSync(path.join(legacyDataDir, "albums.json"), "utf-8"),
  );

  const userIdMap = new Map<string, string>();
  const bandIdMap = new Map<string, string>();

  // Seed Users
  console.log(`Seeding ${legacyUsers.length} users...`);
  for (const lu of legacyUsers) {
    const newId = randomUUID();
    userIdMap.set(lu._id, newId);

    await userRepo
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({
        id: newId,
        email: lu.email,
        name: lu.name,
        passwordHash: lu.hash,
        admin: lu.admin === "true" || lu.admin === true,
      })
      .execute();
  }
  console.log("Users seeded");

  // Seed Bands
  console.log(`Seeding ${legacyBands.length} bands...`);
  for (const lb of legacyBands) {
    const newId = randomUUID();
    bandIdMap.set(lb._id, newId);

    const authorId = userIdMap.get(lb.author);
    if (!authorId) {
      console.warn(`No user mapping for band "${lb.name}" author: ${lb.author}`);
      continue;
    }

    await bandRepo
      .createQueryBuilder()
      .insert()
      .into(Band)
      .values({
        id: newId,
        name: lb.name,
        slug: lb.slug,
        description: lb.description || undefined,
        labels: lb.labels || [],
        personnel: lb.personnel || [],
        pastPersonnel: lb.pastPersonnel || [],
        tags: lb.tags || [],
        yearsActive: (lb.yearsActive || []).map((d: string) => new Date(d)),
        created: lb.created ? new Date(lb.created) : new Date(),
        locationAddress: lb.location?.address || undefined,
        locationLng: lb.location?.coordinates?.[0] || undefined,
        locationLat: lb.location?.coordinates?.[1] || undefined,
        youtubePl: lb.youtubePL || undefined,
        vimeoPl: lb.vimeoPL || undefined,
        spotifyId: lb.spotifyID || undefined,
        spotifyUrl: lb.spotifyURL || undefined,
        authorId,
      })
      .execute();
  }
  console.log("Bands seeded");

  // Seed Albums
  console.log(`Seeding ${legacyAlbums.length} albums...`);
  for (const la of legacyAlbums) {
    const bandId = bandIdMap.get(la.bandID);
    if (!bandId) {
      console.warn(`No band mapping for album "${la.title}" bandID: ${la.bandID}`);
      continue;
    }

    await albumRepo
      .createQueryBuilder()
      .insert()
      .into(Album)
      .values({
        title: la.title,
        slug: la.slug,
        releaseDate: la.releaseDate ? new Date(la.releaseDate) : undefined,
        artist: la.artist,
        bandId,
        cover: la.cover || undefined,
        producer: la.producer || [],
        engineer: la.engineer || [],
        mixedBy: la.mixedBy || [],
        label: la.label || undefined,
        tracks: la.tracks || [],
        spotifyUrl: la.spotifyURL || undefined,
        bandcampUrl: la.bandcampURL || undefined,
        comments: la.comments || undefined,
      })
      .execute();
  }
  console.log("Albums seeded");

  console.log("Seeding complete!");
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
