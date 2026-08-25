import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveSession } from "@/lib/browser/session";
import { detectPageFormFields } from "@/lib/browser/form-detector";
import { executeFormFilling } from "@/lib/browser/form-filler";
import { capturePageScreenshot } from "@/lib/browser/navigation";
import { Profile } from "@/lib/types/profile";

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
        await supabase.auth.setSession({ access_token: token, refresh_token: "" }).catch(() => {});
      }
    } else {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to fill form fields." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID." }, { status: 400 });
    }

    const sessionInstance = getActiveSession(sessionId);
    if (!sessionInstance) {
      return NextResponse.json(
        { error: "Active browser session not found or expired. Please restart session." },
        { status: 404 }
      );
    }

    // 1. Fetch Student's Verified Profile ONLY
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const profile: Profile | null = (profileRow as Profile) || null;

    // 2. Detect visible form fields on the actual Playwright page
    const detectedFields = await detectPageFormFields(sessionInstance.page);

    // 3. Execute filling with verified profile
    const fillResult = await executeFormFilling(sessionInstance.page, detectedFields, profile);

    // 4. Capture live updated viewport screenshot
    const updatedScreenshot = await capturePageScreenshot(sessionInstance.page);

    return NextResponse.json({
      success: true,
      summary: {
        detected_fields_count: fillResult.detected_count,
        matched_fields_count: fillResult.matched_count,
        filled_fields_count: fillResult.filled_count,
        needs_input_count: fillResult.needs_input_count,
        security_challenge_detected: fillResult.security_challenge_detected,
        status_message: fillResult.status_message,
        mappings: fillResult.mappings,
        screenshotBase64: updatedScreenshot,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Auto-fill failed";
    console.error("Autofill API error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
