import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
        { error: "Unauthorized. Please log in to save application forms." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, form_data, status } = body;

    if (!id || !form_data) {
      return NextResponse.json(
        { error: "Missing form ID or form data payload." },
        { status: 400 }
      );
    }

    const { data: updated, error: updateErr } = await supabase
      .from("application_forms")
      .update({
        form_data,
        status: status || "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.warn("Update application_forms error:", updateErr.message);
    }

    return NextResponse.json({
      success: true,
      updated_at: new Date().toISOString(),
      record: updated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to save application form draft";
    console.error("Save form error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
