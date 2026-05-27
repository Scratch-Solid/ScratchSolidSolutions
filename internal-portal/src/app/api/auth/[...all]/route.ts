import { createAuth } from "../../../lib/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

export async function GET(request: Request) {
  const auth = await createAuth();
  const handler = toNextJsHandler(auth.handler);
  return handler.GET(request);
}

export async function POST(request: Request) {
  const auth = await createAuth();
  const handler = toNextJsHandler(auth.handler);
  return handler.POST(request);
}