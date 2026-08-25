import { FormFieldDescriptor, AutoFillSession, FieldMappingResult, AutoFillRequest } from "./types";
import { Profile } from "@/lib/types/profile";
import { buildVerifiedLookup, mapFormField } from "./field-mapper";

// Standard canonical scholarship application field schemas found across Indian portals (NSP, State portals, Foundations)
export const STANDARD_SCHOLARSHIP_FORM_FIELDS: FormFieldDescriptor[] = [
  { id: "txt_candidate_name", name: "candidate_name", label: "Full Name of Applicant", type: "text", autocomplete: "name", required: true },
  { id: "txt_dob", name: "date_of_birth", label: "Date of Birth (DD/MM/YYYY)", type: "text", autocomplete: "bday", required: true },
  { id: "sel_gender", name: "gender", label: "Gender", type: "select", autocomplete: "sex", required: true },
  { id: "txt_mobile", name: "mobile_number", label: "Mobile Number", type: "tel", autocomplete: "tel", required: true },
  { id: "txt_email", name: "email_address", label: "Email Address", type: "email", autocomplete: "email", required: true },
  { id: "txt_aadhaar", name: "aadhaar_number", label: "Aadhaar / National ID Number", type: "text", required: true },
  { id: "txt_father", name: "father_name", label: "Father's / Guardian's Full Name", type: "text", required: true },
  { id: "txt_mother", name: "mother_name", label: "Mother's Full Name", type: "text", required: false },
  { id: "txt_address", name: "permanent_address", label: "Permanent Residential Address", type: "text", autocomplete: "street-address", required: true },
  { id: "txt_city", name: "city_district", label: "City / District", type: "text", autocomplete: "address-level2", required: true },
  { id: "sel_state", name: "domicile_state", label: "State of Domicile", type: "select", autocomplete: "address-level1", required: true },
  { id: "txt_pincode", name: "pincode", label: "Pincode", type: "text", autocomplete: "postal-code", required: true },
  { id: "txt_institution", name: "college_institution_name", label: "College / University Name", type: "text", required: true },
  { id: "txt_degree", name: "degree_course_level", label: "Degree / Course Level", type: "text", required: true },
  { id: "txt_branch", name: "branch_major", label: "Branch / Specialization", type: "text", required: true },
  { id: "txt_rollno", name: "roll_number", label: "Class Roll / Registration Number", type: "text", required: true },
  { id: "txt_percentage", name: "previous_percentage", label: "Previous Academic Percentage (%)", type: "text", required: true },
  { id: "txt_income", name: "annual_family_income", label: "Annual Family Income (INR)", type: "text", required: true },
  { id: "sel_category", name: "social_category", label: "Social Category / Caste", type: "select", required: true },
  { id: "txt_bank_account", name: "bank_account_number", label: "Student Bank Account Number", type: "text", required: true },
  { id: "txt_ifsc_code", name: "ifsc_code", label: "Bank IFSC Code", type: "text", required: true },
  { id: "txt_captcha", name: "security_captcha", label: "Security Verification Code (CAPTCHA)", type: "captcha", required: true },
];

/**
 * Performs assisted form field auto-fill mapping using student's verified profile data
 */
export function generateAutoFillSession(
  request: AutoFillRequest,
  profile: Profile | null,
  customFields?: FormFieldDescriptor[]
): AutoFillSession {
  const fieldsToProcess = customFields && customFields.length > 0
    ? customFields
    : (request.form_fields && request.form_fields.length > 0 ? request.form_fields : STANDARD_SCHOLARSHIP_FORM_FIELDS);

  const verifiedLookup = buildVerifiedLookup(profile);

  const mappings: FieldMappingResult[] = fieldsToProcess.map((field) =>
    mapFormField(field, verifiedLookup, profile)
  );

  const filledCount = mappings.filter((m) => m.status === "filled").length;
  const needsInputCount = mappings.filter((m) => m.status === "needs_user_input").length;
  const securityCount = mappings.filter((m) => m.status === "manual_security_challenge").length;
  const skippedCount = mappings.filter((m) => m.status === "skipped").length;

  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    scholarship_title: request.scholarship_title,
    provider: request.provider,
    official_url: request.official_url,
    started_at: new Date().toISOString(),
    status: "ready_for_review",
    fields_filled_count: filledCount,
    fields_requiring_input_count: needsInputCount,
    fields_skipped_count: skippedCount,
    security_challenges_count: securityCount,
    mappings,
  };
}
