import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_data")
      .eq("user_id", user.id)
      .maybeSingle();

    const tasks = ((profile?.profile_data?.action_center_tasks as ActionTask[]) || []).filter(
      (t) => t.user_id === user.id
    );

    return NextResponse.json({ success: true, tasks });
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
    const {
      title,
      description = "",
      category = "Study",
      priority = "medium",
      due_date,
      start_time = "",
      end_time = "",
      all_day = false,
      recurrence = "none",
      reminder_offset = "15m",
      source_type = "MANUAL",
      source_id,
      source_title,
    } = body;

    if (!title || !due_date) {
      return NextResponse.json({ error: "Title and due_date are required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const newTask: ActionTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: user.id,
      title: String(title).trim(),
      description: String(description || "").trim(),
      category,
      priority,
      due_date: String(due_date).trim(),
      start_time: start_time || undefined,
      end_time: end_time || undefined,
      all_day: Boolean(all_day),
      completed: false,
      completed_at: null,
      recurrence,
      reminder_offset,
      source_type,
      source_id,
      source_title,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Load existing profile
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingProfile = profileRow as Profile | null;
    const existingPData = existingProfile?.profile_data || {};
    const existingTasks = (existingPData.action_center_tasks as ActionTask[]) || [];

    const updatedTasks = [newTask, ...existingTasks];

    await supabase
      .from("profiles")
      .update({
        profile_data: {
          ...existingPData,
          action_center_tasks: updatedTasks,
        },
        updated_at: nowIso,
      })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, task: newTask, tasks: updatedTasks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const { id, completed, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingProfile = profileRow as Profile | null;
    const existingPData = existingProfile?.profile_data || {};
    const existingTasks = (existingPData.action_center_tasks as ActionTask[]) || [];

    const nowIso = new Date().toISOString();

    const updatedTasks = existingTasks.map((t) => {
      if (t.id === id && t.user_id === user.id) {
        const isCompleted = completed !== undefined ? Boolean(completed) : t.completed;
        return {
          ...t,
          ...updates,
          completed: isCompleted,
          completed_at: isCompleted ? (t.completed_at || nowIso) : null,
          updated_at: nowIso,
        };
      }
      return t;
    });

    await supabase
      .from("profiles")
      .update({
        profile_data: {
          ...existingPData,
          action_center_tasks: updatedTasks,
        },
        updated_at: nowIso,
      })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, tasks: updatedTasks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 });
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingProfile = profileRow as Profile | null;
    const existingPData = existingProfile?.profile_data || {};
    const existingTasks = (existingPData.action_center_tasks as ActionTask[]) || [];

    const updatedTasks = existingTasks.filter((t) => t.id !== id || t.user_id !== user.id);

    await supabase
      .from("profiles")
      .update({
        profile_data: {
          ...existingPData,
          action_center_tasks: updatedTasks,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, tasks: updatedTasks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
