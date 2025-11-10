import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { imageUrl, prompt } = await request.json();
  if (!imageUrl || !prompt) {
    return NextResponse.json({ error: "Missing imageUrl or prompt" }, { status: 400 });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const klingVersion = process.env.KLING_MODEL_VERSION || "kwaivgi/kling-v2.5-turbo-pro";

  if (!replicateToken) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const body = {
      version: klingVersion,
      input: {
        image: imageUrl,
        prompt,
        duration: 5,
      },
    };

    const r = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateToken}`,
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
  } catch (err: unknown) {
    console.error("start-video-generation error", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to start video generation";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}