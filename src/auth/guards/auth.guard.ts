import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request, Response } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (req.isAuthenticated()) {
      return true;
    }

    req.session["flash"] = {
      error: ["You must be logged in to access that page"],
    };
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) =>
        err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve(),
      );
    });
    res.redirect("/auth/login");
    return false;
  }
}
