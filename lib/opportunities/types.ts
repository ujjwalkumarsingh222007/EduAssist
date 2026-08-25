import { StudentDocument } from "@/lib/types/document";

export type OpportunityType =
  | "scholarship"
  | "internship"
  | "fellowship"
  | "competition"
  | "educational_program";

export type EligibilityStatus =
  | "ELIGIBLE"
  | "PARTIALLY_ELIGIBLE"
  | "INELIGIBLE"
  | "INSUFFICIENT_INFORMATION";

export type CriterionResult = "PASS" | "FAIL" | "INSUFFICIENT_INFO";

export type RequirementOperator =
  | ">="
  | "<="
  | "=="
  | "!="
  | "contains"
  | "in"
  | "any";

export interface StructuredRequirementRule {
  field: string;
  operator: RequirementOperator;
  value: string | number | string[];
  required: boolean;
  label?: string;
  description?: string;
}

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  organization: string;
  description: string;
  application_url: string;
  source_url: string;
  location: string;
  remote: boolean;
  deadline: string;
  duration?: string;
  stipend?: string;
  amount?: string;
  eligibility_text: string;
  requirements: StructuredRequirementRule[];
  required_skills: string[];
  preferred_skills: string[];
  education_requirements: string[];
  required_documents: string[];
  application_status?: "open" | "closing_soon" | "closed";
  created_at: string;
  updated_at: string;
}

export interface EvaluationCriterionResult {
  requirement_label: string;
  required_value_display: string;
  student_value_display: string;
  result: CriterionResult;
  source_display: string;
  reason: string;
  is_mandatory: boolean;
}

export interface ApplicationReadiness {
  profile_complete: boolean;
  required_documents_available: boolean;
  is_eligible: boolean;
  total_required_documents: number;
  available_documents_count: number;
  missing_documents: string[];
  captcha_manual: boolean;
  otp_manual: boolean;
  can_apply: boolean;
}

export interface OpportunityEvaluationResult {
  opportunity: Opportunity;
  status: EligibilityStatus;
  overall_match_score: number; // 0-100%
  eligibility_match_score: number; // 0-100%
  skill_match_score: number; // 0-100%
  matched_skills: string[];
  missing_skills: string[];
  preferred_skills_matched: string[];
  criteria_results: EvaluationCriterionResult[];
  missing_documents: string[];
  recommended_actions: string[];
  application_readiness: ApplicationReadiness;
  evaluated_at: string;
}

export interface OpportunityDiscoveryResult {
  total_found: number;
  scholarships_count: number;
  internships_count: number;
  eligible_count: number;
  review_required_count: number;
  ineligible_count: number;
  matches: OpportunityEvaluationResult[];
  searched_at: string;
}
