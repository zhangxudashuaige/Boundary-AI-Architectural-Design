import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/config/api";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    const upstreamResponse = await fetch(
      `${getApiBaseUrl()}/api/inspiration`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageUrl: body?.imageUrl,
          rawPrompt: body?.rawPrompt,
          refinedPrompt: body?.refinedPrompt,
          prompt: body?.prompt
        }),
        cache: "no-store"
      }
    );

    const contentType = upstreamResponse.headers.get("content-type") || "";
    let payload = {};

    if (contentType.includes("application/json")) {
      payload = await upstreamResponse.json();
    } else {
      const text = await upstreamResponse.text();
      payload = {
        message: text || "Inspiration service returned an unexpected response"
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
          ? "Inspiration request was aborted"
          : "Failed to connect to the inspiration service"
      },
      {
        status: isAbort ? 499 : 502
      }
    );
  }
}
