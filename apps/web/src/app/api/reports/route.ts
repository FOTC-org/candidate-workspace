import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3001/api/v1";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const upstream = `${API_URL}/reports${query ? `?${query}` : ""}`;

  const authorization = request.headers.get("Authorization") ?? "";

  const upstreamRes = await fetch(upstream, {
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
  });

  const data = await upstreamRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstreamRes.status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authorization = request.headers.get("Authorization") ?? "";
  const body = await request.text();

  const upstreamRes = await fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body,
  });

  const data = await upstreamRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstreamRes.status });
}
