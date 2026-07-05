import type { Request, Response } from "express";

export type MockResponse = {
  status: jest.Mock;
  render: jest.Mock;
  redirect: jest.Mock;
};

export interface MockReqOptions {
  userId?: string;
  referer?: string;
}

export function makeReq(opts: MockReqOptions = {}): Request {
  const { userId, referer } = opts;
  return {
    ...(userId !== undefined && { user: { id: userId } }),
    ...(referer !== undefined && { headers: { referer } }),
    session: {
      save: jest.fn((cb: () => void) => cb()),
    },
  } as unknown as Request;
}

export function makeRes(): MockResponse {
  const res = { render: jest.fn(), redirect: jest.fn() } as unknown as Response;
  (res as unknown as { status: jest.Mock }).status = jest.fn().mockReturnValue(res);
  return res as unknown as MockResponse;
}
