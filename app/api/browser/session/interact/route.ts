import { NextRequest, NextResponse } from "next/server";
import { interactWithSession } from "@/lib/browser/session";
import { BrowserInteractionAction } from "@/lib/browser/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, action } = body as { sessionId: string; action: BrowserInteractionAction };

    if (!sessionId || !action) {
      return NextResponse.json({ error: "Missing sessionId or action payload." }, { status: 400 });
    }

    const result = await interactWithSession(sessionId, action);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Interaction failed." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      screenshotBase64: result.screenshot,
      url: result.url,
      pageTitle: result.pageTitle,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Interaction error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
