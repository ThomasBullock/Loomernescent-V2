import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import session from 'express-session';
import passport from 'passport';
import connectPgSimple from 'connect-pg-simple';

const PgStore = connectPgSimple(session);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setViewEngine('pug');
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        // createTableIfMissing: true — tells connect-pg-simple to auto-create the session table on first connection.
        // Without it you'd need to run the library's SQL manually.
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        // secure: production-only — the cookie is HTTPS-only in prod but works over HTTP in local dev.
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // explicit is better than assumed
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  // session(...) — reads the session cookie, loads session data onto req.session
  // passport.initialize() — sets up req._passport machinery
  // passport.session() — looks for req.session.passport.user, calls your SessionSerializer.deserializeUser, populates req.user
  // If these are in the wrong order, req.user won't be set on subsequent requests.

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
