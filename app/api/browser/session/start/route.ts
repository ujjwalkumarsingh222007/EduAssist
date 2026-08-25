import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBrowserSession } from "@/lib/browser/session";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    let supabase = await createClient();
    let user = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { createClient: createJsClient } = await import("@supabase/supabase-js");
      supabase = createJsClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: { persistSession: false },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );

      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    } else {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to start a browser workspace session." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { error: "Please provide a valid application portal URL." },
        { status: 400 }
      );
    }

    // Resolve relative URL (e.g. /test-scholarship-form)
    let targetUrl = url.trim();
    if (targetUrl.startsWith("/")) {
      const origin = req.nextUrl.origin || "http://localhost:3000";
      targetUrl = `${origin}${targetUrl}`;
    }

    const sessionResult = await createBrowserSession(user.id, targetUrl);

    if (!sessionResult.success || !sessionResult.session) {
      return NextResponse.json(
        { error: sessionResult.error || "Failed to connect to application portal." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      session: sessionResult.session,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to start browser session";
    console.error("Start session API error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
