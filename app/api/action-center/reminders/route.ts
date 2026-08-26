import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildActionCenterSummary } from "@/lib/action-center/action-center-service";
import { ActionTask } from "@/lib/action-center/types";
import { Profile } from "@/lib/types/profile";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: rawDocuments } = await supabase
      .from("documents")
      .select("id, file_name, document_type, extraction_status, extracted_data, created_at")
      .eq("user_id", user.id);

    const profile = profileRow as Profile | null;
    const pData = profile?.profile_data || {};
    const tasks = (pData.action_center_tasks as ActionTask[]) || [];
    const dismissed = (pData.action_center_dismissed_reminders as string[]) || [];

    const summary = buildActionCenterSummary(
      user.id,
      tasks,
      rawDocuments || [],
      profile,
      dismissed
    );

    return NextResponse.json({ success: true, summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const body = await req.json();
    const { action, reminder_id } = body; // action: "dismiss" | "snooze"

    if (!reminder_id) {
      return NextResponse.json({ error: "reminder_id is required" }, { status: 400 });
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const profile = profileRow as Profile | null;
    const pData = profile?.profile_data || {};
    const dismissed = (pData.action_center_dismissed_reminders as string[]) || [];

    if (!dismissed.includes(reminder_id)) {
      dismissed.push(reminder_id);
    }

    await supabase
      .from("profiles")
      .update({
        profile_data: {
          ...pData,
          action_center_dismissed_reminders: dismissed,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, dismissed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
