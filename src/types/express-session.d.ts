import "express-session";

declare module "express-session" {
  interface SessionData {
    flash?: {
      error?: string[];
      success?: string[];
      info?: string[];
    };
    passport?: { user?: unknown };
  }
}
