import { NextRequest, NextResponse } from "next/server";
import { verifyAndConsumePairingCode } from "@/lib/extension/pairing";
import { handleCorsPreflight, jsonWithCors } from "@/lib/api/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code } = body;

    if (!code || typeof code !== "string" || code.trim() === "") {
      return jsonWithCors(
        request,
        {
          success: false,
          connected: false,
          error: "Invalid connection code",
          code: "INVALID_CODE",
        },
        { status: 400 }
      );
    }

    const result = await verifyAndConsumePairingCode(code);

    if (!result.success) {
      const statusCode = result.error === "Connection failed" ? 500 : 400;
      let errCode = "INVALID_CODE";
      if (result.error === "Connection code expired") errCode = "CODE_EXPIRED";
      if (result.error === "Connection code already used") errCode = "CODE_ALREADY_USED";

      return jsonWithCors(
        request,
        {
          success: false,
          connected: false,
          error: result.error,
          code: errCode,
        },
        { status: statusCode }
      );
    }

    // Return ONLY success, connected status, user_id, and connection_id (NO sensitive profile data)
    return jsonWithCors(request, {
      success: true,
      connected: true,
      user_id: result.userId,
      connection_id: result.connectionId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return jsonWithCors(
      request,
      {
        success: false,
        connected: false,
        error: "Connection failed",
        details: msg,
      },
      { status: 500 }
    );
  }
}
