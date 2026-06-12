import "dotenv/config";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { User } from "../entities/user.entity";

interface SeedAccount {
  email: string;
  name: string;
  admin: boolean;
  // env var holding this account's password; falls back to SEED_DEFAULT_PASSWORD
  passwordEnv: string;
}

const ACCOUNTS: SeedAccount[] = [
  {
    email: "motbollox@gmail.com",
    name: "Thomas Bullock",
    admin: true,
    passwordEnv: "SEED_PASSWORD_MOTBOLLOX",
  },
  {
    email: "cochlear@gmail.com",
    name: "Cochlear",
    admin: false,
    passwordEnv: "SEED_PASSWORD_COCHLEAR",
  },
  {
    email: "cochlearkill@gmail.com",
    name: "Cochlear Kill",
    admin: false,
    passwordEnv: "SEED_PASSWORD_COCHLEARKILL",
  },
];

const BCRYPT_COST = 12;

async function seedAccounts(): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);

  for (const acc of ACCOUNTS) {
    const password = process.env[acc.passwordEnv] ?? process.env.SEED_DEFAULT_PASSWORD;
    if (!password) {
      console.warn(`Skipping ${acc.email}: set ${acc.passwordEnv} or SEED_DEFAULT_PASSWORD`);
      continue;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const existing = await repo.findOneBy({ email: acc.email });

    if (existing) {
      existing.name = acc.name;
      existing.admin = acc.admin;
      existing.passwordHash = passwordHash;
      await repo.save(existing);
      console.log(`Updated ${acc.email} (admin=${acc.admin})`);
    } else {
      await repo.save(
        repo.create({
          email: acc.email,
          name: acc.name,
          admin: acc.admin,
          passwordHash,
        }),
      );
      console.log(`Created ${acc.email} (admin=${acc.admin})`);
    }
  }

  await AppDataSource.destroy();
  console.log("Account seeding complete.");
}

seedAccounts().catch((err) => {
  console.error("Account seeding failed:", err);
  process.exit(1);
});
