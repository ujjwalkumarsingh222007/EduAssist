export type SourceType = "database" | "web_discovery";

export type EligibilityStatus = "eligible" | "potentially_eligible" | "not_eligible";

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  description: string;
  amount: string;
  deadline: string;
  education_levels: string[];
  courses?: string[];
  minimum_percentage?: number | null;
  maximum_income?: number | null;
  eligible_gender?: "Any" | "Female" | "Male" | "Other";
  eligible_categories?: string[];
  eligible_states?: string[];
  required_documents: string[];
  application_url: string;
  source_url: string;
  source_name: string;
  source_type: SourceType;
  date_found: string;
  is_verified: boolean;
  needs_verification?: boolean;
}

export interface DocumentRequirementMatch {
  document_name: string;
  is_available: boolean;
  source_document_file?: string;
}

export interface EligibilityMatch {
  scholarship: Scholarship;
  status: EligibilityStatus;
  match_score: number;
  matched_requirements: string[];
  missing_requirements: string[];
  failed_requirements: string[];
  document_matches: DocumentRequirementMatch[];
  reason: string;
}

export interface ScholarshipDiscoveryResult {
  total_found: number;
  database_count: number;
  web_count: number;
  eligible_count: number;
  potentially_eligible_count: number;
  not_eligible_count: number;
  matches: EligibilityMatch[];
  searched_at: string;
}
