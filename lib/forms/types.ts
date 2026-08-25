export type FieldCategory =
  | "personal"
  | "family"
  | "identity"
  | "education"
  | "financial"
  | "address"
  | "security_challenge"
  | "unknown";

export type FieldStatus =
  | "filled"
  | "needs_user_input"
  | "manual_security_challenge"
  | "skipped";

export interface FormFieldDescriptor {
  id: string;
  name: string;
  label: string;
  type: string; // "text" | "email" | "tel" | "date" | "select" | "number" | "captcha" | etc.
  placeholder?: string;
  autocomplete?: string;
  options?: string[];
  required?: boolean;
}

export interface FieldMappingResult {
  field_id: string;
  field_label: string;
  field_name: string;
  field_type: string;
  category: FieldCategory;
  status: FieldStatus;
  mapped_profile_key?: string;
  filled_value: string | null;
  display_value: string | null; // Masked if sensitive
  is_sensitive: boolean;
  notes?: string;
}

export interface AutoFillSession {
  id: string;
  scholarship_title: string;
  provider: string;
  official_url: string;
  started_at: string;
  completed_at?: string;
  status: "in_progress" | "ready_for_review" | "completed";
  fields_filled_count: number;
  fields_requiring_input_count: number;
  fields_skipped_count: number;
  security_challenges_count: number;
  mappings: FieldMappingResult[];
}

export interface AutoFillRequest {
  scholarship_id: string;
  scholarship_title: string;
  provider: string;
  official_url: string;
  form_fields?: FormFieldDescriptor[];
}

export interface AutoFillResponse {
  success: boolean;
  session: AutoFillSession;
  message: string;
}
