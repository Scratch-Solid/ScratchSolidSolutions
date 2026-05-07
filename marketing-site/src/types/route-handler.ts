import { NextRequest } from "next/server";

type RouteParams<T extends Record<string, string>> = {
  params: Promise<T>;
};

export type { RouteParams, NextRequest };
