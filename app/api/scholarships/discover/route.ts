import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchDatabaseScholarships } from "@/lib/scholarships/database";
import { discoverWebScholarships, buildAnonymousSearchCriteria } from "@/lib/scholarships/web-search";
import { deduplicateScholarships } from "@/lib/scholarships/deduplication";
import { evaluateScholarshipEligibility } from "@/lib/scholarships/eligibility";
import { ScholarshipDiscoveryResult, EligibilityMatch } from "@/lib/scholarships/types";
import { Profile } from "@/lib/types/profile";
import { StudentDocument } from "@/lib/types/document";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    let supabase = await createClient();
    let user = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { createServerClient } = await import("@supabase/ssr");
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          cookies: {
            getAll() {
              return [];
            },
            setAll() {},
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
        { error: "Unauthorized. Please log in to discover scholarships." },
        { status: 401 }
      );
    }

    // 1. Fetch Student's Verified Profile
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const profile: Profile | null = (profileRow as Profile) || null;

    // 2. Fetch Student's Uploaded Documents (for document matching)
    const { data: docRows } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id);

    const documents: StudentDocument[] = (docRows as StudentDocument[]) || [];

    // 3. Search Supabase Scholarships Database
    const dbScholarships = await searchDatabaseScholarships();

    // 4. Live Web Scholarship Discovery (Uses only non-sensitive academic context)
    const searchCriteria = buildAnonymousSearchCriteria(profile);
    const webScholarships = await discoverWebScholarships(searchCriteria);

    // 5. Deduplicate and Merge Results
    const allScholarships = deduplicateScholarships(dbScholarships, webScholarships);

    // 6. Evaluate Deterministic Eligibility against verified profile
    const evaluatedMatches: EligibilityMatch[] = allScholarships.map((scholarship) =>
      evaluateScholarshipEligibility(scholarship, profile, documents)
    );

    // 7. Sort by status priority: eligible -> potentially_eligible -> not_eligible
    const priorityOrder = { eligible: 0, potentially_eligible: 1, not_eligible: 2 };
    evaluatedMatches.sort((a, b) => {
      if (priorityOrder[a.status] !== priorityOrder[b.status]) {
        return priorityOrder[a.status] - priorityOrder[b.status];
      }
      return b.match_score - a.match_score;
    });

    const eligibleCount = evaluatedMatches.filter((m) => m.status === "eligible").length;
    const potentiallyEligibleCount = evaluatedMatches.filter((m) => m.status === "potentially_eligible").length;
    const notEligibleCount = evaluatedMatches.filter((m) => m.status === "not_eligible").length;

    const result: ScholarshipDiscoveryResult = {
      total_found: allScholarships.length,
      database_count: dbScholarships.length,
      web_count: webScholarships.length,
      eligible_count: eligibleCount,
      potentially_eligible_count: potentiallyEligibleCount,
      not_eligible_count: notEligibleCount,
      matches: evaluatedMatches,
      searched_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to discover scholarships";
    console.error("Scholarship discovery error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
