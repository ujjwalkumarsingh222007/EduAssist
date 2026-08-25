import { NextRequest, NextResponse } from "next/server";
import { validateExtensionConnection } from "@/lib/extension/pairing";
import { handleCorsPreflight, jsonWithCors } from "@/lib/api/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonWithCors(
        request,
        {
          success: false,
          connected: false,
          error: "Authentication error",
          code: "NOT_AUTHENTICATED",
          profile_connected: false,
        },
        { status: 401 }
      );
    }

    const tokenOrConnectionId = authHeader.split(" ")[1];
    if (!tokenOrConnectionId || tokenOrConnectionId.trim() === "") {
      return jsonWithCors(
        request,
        {
          success: false,
          connected: false,
          error: "Authentication error",
          code: "INVALID_TOKEN",
          profile_connected: false,
        },
        { status: 401 }
      );
    }

    // Check extension connection_id
    const { valid, userId } = await validateExtensionConnection(tokenOrConnectionId);
    if (!valid || !userId) {
      return jsonWithCors(
        request,
        {
          success: false,
          connected: false,
          error: "Connection code expired",
          code: "SESSION_EXPIRED",
          profile_connected: false,
        },
        { status: 401 }
      );
    }

    return jsonWithCors(request, {
      success: true,
      connected: true,
      user_id: userId,
      profile_connected: true,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected server error";
    return jsonWithCors(
      request,
      {
        success: false,
        connected: false,
        error: "Unexpected server error",
        details: errorMsg,
        profile_connected: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
