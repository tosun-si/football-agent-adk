import { NextRequest, NextResponse } from "next/server";

const PROXY_URL = process.env.AGENT_ENGINE_PROXY_URL;

export async function POST(request: NextRequest) {
  if (!PROXY_URL) {
    return NextResponse.json(
      { error: "AGENT_ENGINE_PROXY_URL not configured" },
      { status: 500 }
    );
  }

  try {
    const { message } = await request.json();

    const res = await fetch(`${PROXY_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Agent Engine proxy error: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ response: data.response });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to reach Agent Engine proxy",
      },
      { status: 500 }
    );
  }
}
