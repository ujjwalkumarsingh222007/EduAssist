import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeDocumentHealth, UserDocumentItem } from "@/lib/health/document-health-service";
import { Profile } from "@/lib/types/profile";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user documents (strictly user-scoped)
    const { data: rawDocuments, error: docError } = await supabase
      .from("documents")
      .select("id, user_id, file_name, document_type, extraction_status, extracted_data, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (docError) {
      return NextResponse.json({ error: `Failed to fetch documents: ${docError.message}` }, { status: 500 });
    }

    // 2. Fetch existing profile
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingProfile = profileRow as Profile | null;
    const existingPData = existingProfile?.profile_data || {};
    const dismissedReminders = (existingPData.document_health?.dismissed_reminders as string[]) || [];

    // 3. Compute Document Health
    const healthState = computeDocumentHealth(
      user.id,
      (rawDocuments as UserDocumentItem[]) || [],
      existingProfile,
      dismissedReminders
    );

    // 4. Cache in profile_data.document_health
    const updatedProfileData = {
      ...existingPData,
      document_health: healthState,
    };

    if (existingProfile) {
      await supabase
        .from("profiles")
        .update({
          profile_data: updatedProfileData,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      success: true,
      health: healthState,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
