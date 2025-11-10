import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API = "https://api.replicate.com/v1/predictions";
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const IMG2PROMPT_VERSION = process.env.IMG2PROMPT_MODEL_VERSION || "methexis-inc/img2prompt:50adaf2d3ad20a6f911a8a9e3ccf777b263b8599fbd2c8fc26e8888f8a0edbb5f";

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { imageUrl } = await request.json();
  if (!imageUrl) {
    return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
  }

  if (!REPLICATE_TOKEN) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const body = {
      version: IMG2PROMPT_VERSION,
      input: { image: imageUrl }
    };

    const r = await fetch(REPLICATE_API, {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("start-prompt-analysis error:", data);
      return NextResponse.json({ error: data.detail || "Failed to start prompt analysis" }, { status: r.status });
    }

    // Return prediction id immediately
    return NextResponse.json({ id: data.id, status: data.status || "started" });
  } catch (err: any) {
    console.error("start-prompt-analysis error", err);
    return NextResponse.json({ error: err?.message || "Failed to start prompt analysis" }, { status: 500 });
  }
}