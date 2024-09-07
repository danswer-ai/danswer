import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path);
}

async function handleRequest(request: NextRequest, path: string[]) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        message:
          "This API is only available in development mode. In production, something else (e.g. nginx) should handle this.",
      },
      { status: 404 }
    );
  }

  try {
    const backendUrl = new URL(`http://localhost:8080/${path.join("/")}`);
    const requestBody = request.body
      ? JSON.stringify(await request.json())
      : null;
    // console.log(requestBody)

    // Get the URL parameters from the request
    const urlParams = new URLSearchParams(request.url.split("?")[1]);

    // Append the URL parameters to the backend URL
    urlParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value);
    });

    const response = await fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: requestBody,
    });

    // Check if the response is a stream
    if (
      response.headers.get("Transfer-Encoding") === "chunked" ||
      response.headers.get("Content-Type")?.includes("stream")
    ) {
      // If it's a stream, create a TransformStream to pass the data through
      const { readable, writable } = new TransformStream();
      response.body?.pipeTo(writable);

      return new NextResponse(readable, {
        status: response.status,
        headers: response.headers,
      });
    } else {
      // If it's not a stream, handle it as before
      const data = await response.text();
      const contentType =
        response.headers.get("content-type") || "application/json";

      return new NextResponse(data, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
        },
      });
    }
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        message: "Proxy error",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
