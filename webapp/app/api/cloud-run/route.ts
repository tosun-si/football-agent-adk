import { NextRequest, NextResponse } from "next/server";

const CLOUD_RUN_URL = process.env.CLOUD_RUN_API_URL;
const USER_ID = "webapp-user";
const SESSION_ID = "webapp-session";
const APP_NAME = "football_stats_agent";

async function ensureSession(): Promise<void> {
  const url = `${CLOUD_RUN_URL}/apps/${APP_NAME}/users/${USER_ID}/sessions/${SESSION_ID}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export async function POST(request: NextRequest) {
  if (!CLOUD_RUN_URL) {
    return NextResponse.json(
      { error: "CLOUD_RUN_API_URL not configured" },
      { status: 500 }
    );
  }

  try {
    const { message } = await request.json();

    await ensureSession();

    const res = await fetch(`${CLOUD_RUN_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appName: APP_NAME,
        userId: USER_ID,
        sessionId: SESSION_ID,
        newMessage: {
          parts: [{ text: message }],
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Cloud Run error: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Extract agent response text from the ADK response format
    // The response contains an array of event objects with content parts
    let responseText = "";
    if (Array.isArray(data)) {
      for (const event of data) {
        const parts = event?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.text) {
              responseText += part.text;
            }
          }
        }
      }
    } else if (data?.content?.parts) {
      for (const part of data.content.parts) {
        if (part.text) {
          responseText += part.text;
        }
      }
    }

    return NextResponse.json({
      response: responseText || "No response from agent",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to reach Cloud Run",
      },
      { status: 500 }
    );
  }
}
