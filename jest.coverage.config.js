// Combined Jest config used only for coverage reporting in CI.
// Runs the unit and integration suites together in a single invocation so their
// coverage merges into one report.
//
// It is rooted at the repo root (not src/ or test/) so `collectCoverageFrom`
// resolves against the source tree — a "projects" setup reports 0% here because
// coverage globs are resolved per-project relative to each project's rootDir.
//
// globalSetup/setupFiles (the integration DB migration + env wiring) run for the
// whole suite; that's harmless for the unit tests, which don't touch the DB.
// maxWorkers: 1 serializes the run because the integration tests share one DB.
//
// Local `npm test` is unaffected — it still uses the unit-only `jest` block in
// package.json and needs no database. This config is only used by CI and by the
// `test:cov:all` script, both of which provide TEST_DATABASE_URL.
module.exports = {
  rootDir: ".",
  maxWorkers: 1,
  moduleFileExtensions: ["js", "json", "ts"],
  testMatch: ["<rootDir>/src/**/*.spec.ts", "<rootDir>/test/**/*.integration-spec.ts"],
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
  globalSetup: "<rootDir>/test/global-setup.ts",
  setupFiles: ["<rootDir>/test/setup-env.ts"],
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "coverage",
  coverageReporters: ["json", "lcov", "text", "clover"],
};
