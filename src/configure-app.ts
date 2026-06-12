import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import session from "express-session";
import passport from "passport";
import connectPgSimple from "connect-pg-simple";

const PgStore = connectPgSimple(session);

export function configureApp(app: NestExpressApplication): void {
  app.setViewEngine("pug");
  app.setBaseViewsDir(join(__dirname, "..", "views"));
  app.useStaticAssets(join(__dirname, "..", "public"));

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
}

export function shouldUseSsl(): boolean {
  if (process.env.DATABASE_SSL === "false") {
    return false;
  }
  if (process.env.DATABASE_SSL === "true") {
    return true;
  }
  return /sslmode=require/.test(process.env.DATABASE_URL ?? "");
}
