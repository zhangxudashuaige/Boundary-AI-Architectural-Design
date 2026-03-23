import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/config/api";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    const upstreamResponse = await fetch(`${getApiBaseUrl()}/api/prompt/refine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rawPrompt: body?.rawPrompt
      }),
      cache: "no-store"
    });

    const contentType = upstreamResponse.headers.get("content-type") || "";
    let payload = {};

    if (contentType.includes("application/json")) {
      payload = await upstreamResponse.json();
    } else {
      const text = await upstreamResponse.text();
      payload = {
        message: text || "Prompt refine service returned an unexpected response"
      };
    }

    return NextResponse.json(payload, {
      status: upstreamResponse.status
    });
  } catch (error) {
    const isAbort = error?.name === "AbortError";

    return NextResponse.json(
      {
        message: isAbort
          ? "Prompt refine request was aborted"
          : "Failed to connect to the prompt refine service"
      },
      {
        status: isAbort ? 499 : 502
      }
    );
  }
}
