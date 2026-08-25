import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeBrowserAutoFill } from "@/lib/forms/browser";
import { generateAutoFillSession } from "@/lib/forms/autofill";
import { AutoFillRequest, AutoFillResponse, AutoFillSession } from "@/lib/forms/types";
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
        { error: "Unauthorized. Please log in to use form auto-fill." },
        { status: 401 }
      );
    }

    const body: AutoFillRequest = await req.json();
    const { scholarship_title, official_url, provider } = body;

    if (!scholarship_title || !official_url) {
      return NextResponse.json(
        { error: "Missing scholarship title or official URL." },
        { status: 400 }
      );
    }

    // 1. Fetch Student's Verified Profile ONLY
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("Profile fetch error in route:", profileErr);
    }
    console.log("Autofill route fetched profile:", profileRow ? `Found (${profileRow.full_name})` : "NULL");

    const profile: Profile | null = (profileRow as Profile) || null;

    // Resolve target URL (handle relative local URLs like /test-scholarship-form)
    let fullTargetUrl = official_url;
    if (official_url.startsWith("/")) {
      const origin = req.nextUrl.origin || "http://localhost:3000";
      fullTargetUrl = `${origin}${official_url}`;
    }

    // 2. Perform Real Server-Side Playwright Browser Automation
    const browserResult = await executeBrowserAutoFill(fullTargetUrl, profile);

    let session: AutoFillSession;

    if (browserResult.success && (browserResult.filled.length > 0 || browserResult.needs_user_input.length > 0)) {
      const allMappings = [
        ...browserResult.filled,
        ...browserResult.needs_user_input,
        ...browserResult.skipped,
      ];

      session = {
        id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        scholarship_title,
        provider: provider || "Official Organization",
        official_url: browserResult.current_url || official_url,
        started_at: new Date().toISOString(),
        status: "ready_for_review",
        fields_filled_count: browserResult.filled.length,
        fields_requiring_input_count: browserResult.needs_user_input.length,
        fields_skipped_count: browserResult.skipped.length,
        security_challenges_count: browserResult.security_challenge_detected ? 1 : 0,
        mappings: allMappings,
      };
    } else {
      // Graceful fallback to canonical template if external site actively blocks automated browsing
      session = generateAutoFillSession(
        {
          scholarship_id: body.scholarship_id || "scholarship_app",
          scholarship_title,
          provider: provider || "Official Organization",
          official_url,
          form_fields: body.form_fields,
        },
        profile
      );
    }

    const response: AutoFillResponse = {
      success: true,
      session,
      message: browserResult.message || `Mapped ${session.fields_filled_count} verified fields.`,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Auto-fill session generation failed";
    console.error("Auto-fill error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
