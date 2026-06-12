import bcrypt from "bcrypt";
import { DataSource } from "typeorm";
import request from "supertest";
import type TestAgent from "supertest/lib/agent";
import { NestExpressApplication } from "@nestjs/platform-express";
import { User } from "../../src/entities/user.entity";

export interface CreateUserOptions {
  email?: string;
  password?: string;
  name?: string;
  admin?: boolean;
}

export interface CreatedUser {
  user: User;
  password: string;
}

let userCounter = 0;

export async function createUser(
  ds: DataSource,
  opts: CreateUserOptions = {},
): Promise<CreatedUser> {
  const password = opts.password ?? "password123";
  const passwordHash = await bcrypt.hash(password, 10);
  userCounter += 1;
  const email = opts.email ?? `test-user-${Date.now()}-${userCounter}@example.test`;
  const user = await ds.getRepository(User).save({
    email,
    name: opts.name ?? "Test User",
    passwordHash,
    admin: opts.admin ?? false,
  });
  return { user, password };
}

export function agentFor(app: NestExpressApplication): TestAgent {
  return request.agent(app.getHttpServer());
}

export async function loginAs(
  app: NestExpressApplication,
  email: string,
  password: string,
): Promise<TestAgent> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post("/auth/login").type("form").send({ email, password });
  if (res.status !== 302) {
    throw new Error(`Expected 302 from /auth/login but got ${res.status}: ${res.text}`);
  }
  return agent;
}
