import {
  Opportunity,
  OpportunityDiscoveryResult,
  OpportunityEvaluationResult,
  OpportunityType,
} from "./types";
import { UNIFIED_OPPORTUNITIES_CATALOG } from "./database";
import { evaluateOpportunity } from "@/lib/eligibility/evaluate";
import { Profile } from "@/lib/types/profile";
import { StudentDocument } from "@/lib/types/document";

export interface OpportunityDiscoveryOptions {
  type?: OpportunityType | "all";
  query?: string;
  limit?: number;
}

export function discoverAndEvaluateOpportunities(
  profile: Profile | null,
  uploadedDocuments: StudentDocument[] = [],
  options: OpportunityDiscoveryOptions = {}
): OpportunityDiscoveryResult {
  const { type = "all", query = "", limit = 50 } = options;

  let opportunities = [...UNIFIED_OPPORTUNITIES_CATALOG];

  // Filter by Type
  if (type && type !== "all") {
    opportunities = opportunities.filter((o) => o.type === type);
  }

  // Filter by Query
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    opportunities = opportunities.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.organization.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.required_skills.some((s) => s.toLowerCase().includes(q)) ||
        o.education_requirements.some((e) => e.toLowerCase().includes(q))
    );
  }

  // Evaluate each opportunity against student profile
  const matches: OpportunityEvaluationResult[] = opportunities.map((opp) =>
    evaluateOpportunity(opp, profile, uploadedDocuments)
  );

  // Sort by Eligibility first, then Match Score, then Deadline
  matches.sort((a, b) => {
    const statusWeight = {
      ELIGIBLE: 4,
      PARTIALLY_ELIGIBLE: 3,
      INSUFFICIENT_INFORMATION: 2,
      INELIGIBLE: 1,
    };

    const statusDiff = statusWeight[b.status] - statusWeight[a.status];
    if (statusDiff !== 0) return statusDiff;

    const scoreDiff = b.overall_match_score - a.overall_match_score;
    if (scoreDiff !== 0) return scoreDiff;

    return new Date(a.opportunity.deadline).getTime() - new Date(b.opportunity.deadline).getTime();
  });

  const finalMatches = matches.slice(0, limit);

  return {
    total_found: finalMatches.length,
    scholarships_count: finalMatches.filter((m) => m.opportunity.type === "scholarship").length,
    internships_count: finalMatches.filter((m) => m.opportunity.type === "internship").length,
    eligible_count: finalMatches.filter((m) => m.status === "ELIGIBLE").length,
    review_required_count: finalMatches.filter((m) => m.status === "PARTIALLY_ELIGIBLE" || m.status === "INSUFFICIENT_INFORMATION").length,
    ineligible_count: finalMatches.filter((m) => m.status === "INELIGIBLE").length,
    matches: finalMatches,
    searched_at: new Date().toISOString(),
  };
}
