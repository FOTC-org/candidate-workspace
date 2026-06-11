import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3001/api/v1";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const upstream = `${API_URL}/users/${path.join("/")}${query ? `?${query}` : ""}`;

  const authorization = request.headers.get("Authorization") ?? "";
  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body,
  });

  const data = await upstreamRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstreamRes.status });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
