import { NextRequest, NextResponse } from "next/server";
import { closeBrowserSession } from "@/lib/browser/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (sessionId) {
      await closeBrowserSession(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error closing session";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
