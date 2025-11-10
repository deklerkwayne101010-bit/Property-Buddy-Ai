import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API_BASE = "https://api.replicate.com/v1/predictions";
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (!REPLICATE_TOKEN) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const r = await fetch(`${REPLICATE_API_BASE}/${id}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: text }, { status: r.status });
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("get-prediction error", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch prediction" }, { status: 500 });
  }
}