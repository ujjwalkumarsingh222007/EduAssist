import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeApplicationUrl } from "@/lib/forms/analyzer";
import { prefillFormFromProfile } from "@/lib/forms/profile-mapper";
import { Profile } from "@/lib/types/profile";
import { StudentDocument } from "@/lib/types/document";

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
        { error: "Unauthorized. Please log in to analyze application forms." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { source_url } = body;

    if (!source_url || typeof source_url !== "string" || !source_url.trim()) {
      return NextResponse.json(
        { error: "Please provide a valid application URL." },
        { status: 400 }
      );
    }

    const cleanUrl = source_url.trim();

    // 1. Fetch Student's Verified Profile & Uploaded Documents
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const profile: Profile | null = (profileRow as Profile) || null;

    const { data: docRows } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id);

    const documents: StudentDocument[] = (docRows as StudentDocument[]) || [];

    // 2. Analyze URL and generate internal form schema
    const schema = await analyzeApplicationUrl(cleanUrl);

    // 3. Pre-fill schema with verified profile data
    const prefilledData = prefillFormFromProfile(schema, profile, documents);

    // 4. Save initial draft in application_forms table
    const { data: formRecord, error: insertErr } = await supabase
      .from("application_forms")
      .insert({
        user_id: user.id,
        source_url: cleanUrl,
        application_name: schema.application_name,
        form_schema: schema,
        form_data: prefilledData,
        status: "draft",
      })
      .select()
      .single();

    if (insertErr || !formRecord) {
      // If table pending migration, return in-memory record
      console.warn("Could not save to application_forms table directly:", insertErr?.message);
      return NextResponse.json({
        success: true,
        application: {
          id: `temp_${Date.now()}`,
          user_id: user.id,
          source_url: cleanUrl,
          application_name: schema.application_name,
          form_schema: schema,
          form_data: prefilledData,
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      application: formRecord,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to analyze application URL";
    console.error("Form analyze error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
