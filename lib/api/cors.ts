import { NextRequest, NextResponse } from "next/server";

/**
 * Validates and sets CORS headers for Chrome Extension and local dashboard requests.
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") || "*";
  
  // Allow chrome-extension origins, localhost, 127.0.0.1, or same-origin
  const isAllowedOrigin =
    origin.startsWith("chrome-extension://") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin === "*";

  const allowedOrigin = isAllowedOrigin ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCorsPreflight(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export function jsonWithCors(
  request: NextRequest,
  data: Record<string, unknown>,
  init?: { status?: number; statusText?: string }
): NextResponse {
  const headers = getCorsHeaders(request);
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    statusText: init?.statusText,
    headers,
  });
}
