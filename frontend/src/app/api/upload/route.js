import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/config/api";

function isFileLike(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.name === "string" &&
      typeof value.arrayBuffer === "function"
  );
}

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!isFileLike(image)) {
      return NextResponse.json(
        { message: "Image file is required" },
        { status: 400 }
      );
    }

    const upstreamFormData = new FormData();
    upstreamFormData.set("image", image, image.name);

    const upstreamResponse = await fetch(`${getApiBaseUrl()}/api/upload`, {
      method: "POST",
      body: upstreamFormData,
      cache: "no-store"
    });

    const contentType = upstreamResponse.headers.get("content-type") || "";
    let payload = {};

    if (contentType.includes("application/json")) {
      payload = await upstreamResponse.json();
    } else {
      const text = await upstreamResponse.text();
      payload = {
        message: text || "Upload service returned an unexpected response"
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
          ? "Upload request was aborted"
          : "Failed to connect to the upload service"
      },
      {
        status: isAbort ? 499 : 502
      }
    );
  }
}
