import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateToken) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${replicateToken}` },
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: text }, { status: r.status });
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("get-prediction error", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch prediction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}