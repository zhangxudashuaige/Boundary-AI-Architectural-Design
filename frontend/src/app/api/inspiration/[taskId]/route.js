import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/config/api";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const upstreamResponse = await fetch(
      `${getApiBaseUrl()}/api/inspiration/${params.taskId}`,
      {
        method: "GET",
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
        message:
          text || "Inspiration status service returned an unexpected response"
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
          ? "Inspiration status request was aborted"
          : "Failed to connect to the inspiration status service"
      },
      {
        status: isAbort ? 499 : 502
      }
    );
  }
}
