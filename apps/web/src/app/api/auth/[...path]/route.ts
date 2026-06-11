import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3001/api/v1";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const upstream = `${API_URL}/auth/${path.join("/")}`;

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await upstreamRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstreamRes.status });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
