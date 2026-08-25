import { NextRequest, NextResponse } from "next/server";
import { revokeExtensionConnection } from "@/lib/extension/pairing";
import { handleCorsPreflight, jsonWithCors } from "@/lib/api/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    let connectionId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      connectionId = authHeader.split(" ")[1];
    }

    if (!connectionId) {
      const body = await request.json().catch(() => ({}));
      if (body.connection_id) connectionId = body.connection_id;
    }

    if (connectionId) {
      await revokeExtensionConnection(connectionId);
    }

    return jsonWithCors(request, {
      success: true,
      disconnected: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Disconnect error";
    return jsonWithCors(request, { error: msg }, { status: 500 });
  }
}
