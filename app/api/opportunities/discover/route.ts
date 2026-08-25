import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discoverAndEvaluateOpportunities } from "@/lib/opportunities/discovery";
import { OpportunityType } from "@/lib/opportunities/types";
import { Profile } from "@/lib/types/profile";
import { StudentDocument } from "@/lib/types/document";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    let profileRow: Profile | null = null;
    let documentsList: StudentDocument[] = [];

    if (user && !authError) {
      // 1. Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        profileRow = profile as Profile;
      }

      // 2. Fetch user documents
      const { data: documents } = await supabase
        .from("student_documents")
        .select("*")
        .eq("user_id", user.id);

      if (documents && Array.isArray(documents)) {
        documentsList = documents as StudentDocument[];
      }
    }

    const body = await request.json().catch(() => ({}));
    const type = (body.type as OpportunityType | "all") || "all";
    const query = typeof body.query === "string" ? body.query : "";

    const result = discoverAndEvaluateOpportunities(profileRow, documentsList, {
      type,
      query,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Opportunity discovery failed";
    console.error("[Opportunities API Error]:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
