import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { imageUrl } = await request.json();
  if (!imageUrl) {
    return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const img2PromptVersion = process.env.IMG2PROMPT_MODEL_VERSION || "methexis-inc/img2prompt:50adaf2d3ad20a6f911a8a9e3ccf777b263b8599fbd2c8fc26e8888f8a0edbb5f";

  if (!replicateToken) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const body = {
      version: img2PromptVersion,
      input: { image: imageUrl }
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
      console.error("start-prompt-analysis error:", data);
      return NextResponse.json({ error: data.detail || "Failed to start prompt analysis" }, { status: r.status });
    }

    return NextResponse.json({ id: data.id, status: data.status || "started" });
  } catch (err: any) {
    console.error("start-prompt-analysis error", err);
    return NextResponse.json({ error: err?.message || "Failed to start prompt analysis" }, { status: 500 });
  }
}