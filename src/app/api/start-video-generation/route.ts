import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API = "https://api.replicate.com/v1/predictions";
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const KLING_VERSION = process.env.KLING_MODEL_VERSION || "kwaivgi/kling-v2.5-turbo-pro";

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { imageUrl, prompt } = await request.json();
  if (!imageUrl || !prompt) {
    return NextResponse.json({ error: "Missing imageUrl or prompt" }, { status: 400 });
  }

  if (!REPLICATE_TOKEN) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const body = {
      version: KLING_VERSION,
      input: {
        image: imageUrl,
        prompt,
        duration: 5,
      },
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
      console.error("start-video-generation error:", data);
      return NextResponse.json({ error: data.detail || "Failed to start video generation" }, { status: r.status });
    }

    return NextResponse.json({ id: data.id, status: data.status || "started" });
  } catch (err: any) {
    console.error("start-video-generation error", err);
    return NextResponse.json({ error: err?.message || "Failed to start video generation" }, { status: 500 });
  }
}