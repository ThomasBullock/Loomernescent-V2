# Loomernescent v2

> **Work in progress.** A full rebuild of a legacy Express/Mongoose shoegaze music site, undertaken as a closely watched 😉 AI-assisted refactoring exercise using [Cursor](https://cursor.com).

A server-side-rendered catalogue of shoegaze bands, albums, and gear — with admin tools, Spotify integration, image hosting, and a map of band locations.

## Stack

| Concern   | Tech                                                   |
| --------- | ------------------------------------------------------ |
| Framework | NestJS v11 on Express                                  |
| Templates | Pug (SSR via `@Render()`)                              |
| Database  | PostgreSQL on Neon (TypeORM)                           |
| Auth      | Passport local strategy + `express-session`            |
| Images    | ImageKit (upload/transform)                            |
| Mail      | Nodemailer — Mailgun in prod, Mailpit locally          |
| Styles    | SCSS via Dart Sass CLI                                 |
| Tests     | Jest (unit), Supertest (integration), Playwright (e2e) |

## Description

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Local development

### Environment variables

Copy `.env.example` to `.env` and fill in your local values. The `.env` file is
gitignored; production secrets are injected by the host, not committed.

### Email (Mailpit)

For local development, point SMTP at [Mailpit](https://mailpit.axllent.org/) —
a lightweight catcher that captures every outgoing email and shows it in a web
UI. Nothing leaves your machine.

**Install and run:**

```bash
brew install mailpit
mailpit                          # foreground, ^C to stop
# or run in the background:
brew services start mailpit
```

This starts:

- SMTP server on `localhost:1025`
- Web UI at http://localhost:8025

**Configure `.env`:**

```
MAIL_FROM="Loomernescent <dev@localhost>"
MAILGUN_SMTP_HOST=localhost
MAILGUN_SMTP_PORT=1025
MAILGUN_SMTP_LOGIN=
MAILGUN_SMTP_PASSWORD=
```

Leave `MAILGUN_SMTP_LOGIN` / `MAILGUN_SMTP_PASSWORD` blank — Mailpit does not
require auth, and `MailService` skips the `auth` block when both are empty.

**Test it:** trigger an email (e.g. forgot-password flow) and open
http://localhost:8025 to inspect the rendered message.

To test the real Mailgun send path locally, swap in the commented Mailgun block
in `.env`. Note that Mailgun's sandbox domain only delivers to
addresses listed as Authorized Recipients in the Mailgun dashboard.

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests (requires TEST_DATABASE_URL — see below)
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

### E2E test database

E2E tests boot the real Nest app against a dedicated Neon branch. Set
`TEST_DATABASE_URL` in `.env`. The harness refuses to run if
`TEST_DATABASE_URL === DATABASE_URL` (safety rail).

In the Neon console, create a branch off `main` (e.g. named `test`), then copy
its pooled connection string into `TEST_DATABASE_URL`. Branches are isolated
and instant to create; re-create the branch any time for a clean slate.

```bash
# .env
TEST_DATABASE_URL=postgresql://neondb_owner:pwd@ep-<branch-id>-pooler.<region>.aws.neon.tech/neondb?sslmode=require
```

`npm run test:e2e` runs migrations against the test branch automatically on
first run. To reset the test branch to a clean state without re-creating it:

```bash
npm run test:e2e:setup
```

## Deployment

### First-time setup sequence

Run these once against a fresh production database (in order):

```bash
npm run migration:run    # apply schema migrations
npm run seed:accounts    # create admin/user accounts (requires SEED_DEFAULT_PASSWORD)
npm run seed:content     # insert band records from src/seeds/data/bands.json
```

`seed:content` is idempotent — safe to re-run; bands already in the DB (matched by slug) are silently skipped.

### Adding more bands

1. Export the new row(s) from Neon and append to `src/seeds/data/bands.json`.
2. Commit the updated JSON.
3. Run `npm run seed:content` against production — existing rows are untouched.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Neon

npx neonctl@latest init
