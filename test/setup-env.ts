import "dotenv/config";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required for e2e tests. See .env.example.");
}

if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL must differ from DATABASE_URL — refusing to run e2e " +
      "tests against the development/production database.",
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-session-secret";
