/**
 * Smart Field Mapper (Step 6B)
 * Maps raw detected website form fields to canonical student profile fields
 * using the canonical alias dictionary and contextual disambiguation.
 * NOTE: Deterministic matching only. Zero AI / Gemini calls. Zero value exposure.
 */

import {
  FIELD_ALIASES_MAP,
  normalizeAliasKey,
} from "../profile/field-aliases";
import { CANONICAL_FIELD_DICTIONARY } from "../profile/field-schema";

export interface RawDetectedField {
  field_id: string;
  element_type: string;
  input_type: string;
  label: string;
  raw_label?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  aria_label?: string;
  section_context?: string;
  required?: boolean;
  options?: string[];
  total_options?: number;
}

export type MappingStatus = "approved" | "changed" | "ignored" | "pending";

export interface SmartFieldMapping {
  field_id: string;
  website_label: string;
  element_type: string;
  input_type: string;
  canonical_field: string | null;
  canonical_display_name: string;
  confidence: number;
  source: "alias" | "context" | "user_controlled" | "file_upload" | "unknown";
  needs_confirmation: boolean;
  status: MappingStatus;
  user_selected_field?: string | null;
  alternatives?: string[];
  required: boolean;
  options?: string[];
}

// Inverted lookup map built from existing FIELD_ALIASES_MAP
const DIRECT_ALIAS_MAP = new Map<string, string>();
Object.entries(FIELD_ALIASES_MAP).forEach(([canonicalKey, aliases]) => {
  aliases.forEach((alias) => {
    DIRECT_ALIAS_MAP.set(normalizeAliasKey(alias), canonicalKey);
  });
  DIRECT_ALIAS_MAP.set(normalizeAliasKey(canonicalKey), canonicalKey);
});

// Keywords for user-controlled inputs (CAPTCHA, OTP, etc.)
const USER_CONTROLLED_KEYWORDS = [
  "captcha",
  "security code",
  "security pin",
  "verification code",
  "enter captcha",
  "captcha code",
  "otp",
  "one time password",
  "sms otp",
  "email otp",
  "security challenge",
];

export function mapDetectedField(raw: RawDetectedField): SmartFieldMapping {
  const normLabel = normalizeAliasKey(raw.label || "");
  const normName = normalizeAliasKey(raw.name || "");
  const normId = normalizeAliasKey(raw.id || "");
  const normPlaceholder = normalizeAliasKey(raw.placeholder || "");
  const normAria = normalizeAliasKey(raw.aria_label || "");
  const normContext = normalizeAliasKey(raw.section_context || "");

  const fullCombinedText = `${normLabel} ${normName} ${normId} ${normPlaceholder} ${normAria} ${normContext}`.trim();

  // 1. Check Document Upload (file inputs)
  if (raw.element_type === "file" || raw.input_type === "file") {
    let matchedDocType: string | null = null;
    for (const [key, aliases] of Object.entries(FIELD_ALIASES_MAP)) {
      if (key.startsWith("doc_")) {
        for (const alias of aliases) {
          if (fullCombinedText.includes(normalizeAliasKey(alias))) {
            matchedDocType = key;
            break;
          }
        }
      }
      if (matchedDocType) break;
    }

    return {
      field_id: raw.field_id,
      website_label: raw.label || raw.placeholder || raw.name || "Upload Document",
      element_type: "file",
      input_type: "file",
      canonical_field: matchedDocType,
      canonical_display_name: matchedDocType
        ? CANONICAL_FIELD_DICTIONARY[matchedDocType]?.label || "Document Attachment"
        : "📄 Document upload detected",
      confidence: matchedDocType ? 0.95 : 1.0,
      source: "file_upload",
      needs_confirmation: false,
      status: "approved",
      required: Boolean(raw.required),
    };
  }

  // 2. Check Security / User Controlled (CAPTCHA / OTP)
  for (const keyword of USER_CONTROLLED_KEYWORDS) {
    if (fullCombinedText.includes(keyword)) {
      return {
        field_id: raw.field_id,
        website_label: raw.label || raw.placeholder || raw.name || "Security Verification",
        element_type: raw.element_type,
        input_type: raw.input_type,
        canonical_field: null,
        canonical_display_name: "🔒 User controlled",
        confidence: 1.0,
        source: "user_controlled",
        needs_confirmation: false,
        status: "approved",
        required: Boolean(raw.required),
      };
    }
  }

  // 3. Disambiguate generic "Name" fields using surrounding context & attributes
  if (normLabel === "name" || normLabel === "candidate name" || normLabel === "applicant name") {
    if (
      fullCombinedText.includes("father") ||
      fullCombinedText.includes("fathers") ||
      fullCombinedText.includes("parent")
    ) {
      return {
        field_id: raw.field_id,
        website_label: raw.label,
        element_type: raw.element_type,
        input_type: raw.input_type,
        canonical_field: "father_name",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["father_name"]?.label || "Father's Name",
        confidence: 0.95,
        source: "context",
        needs_confirmation: false,
        status: "approved",
        required: Boolean(raw.required),
      };
    }

    if (
      fullCombinedText.includes("mother") ||
      fullCombinedText.includes("mothers")
    ) {
      return {
        field_id: raw.field_id,
        website_label: raw.label,
        element_type: raw.element_type,
        input_type: raw.input_type,
        canonical_field: "mother_name",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["mother_name"]?.label || "Mother's Name",
        confidence: 0.95,
        source: "context",
        needs_confirmation: false,
        status: "approved",
        required: Boolean(raw.required),
      };
    }

    if (
      fullCombinedText.includes("guardian") ||
      fullCombinedText.includes("guardians")
    ) {
      return {
        field_id: raw.field_id,
        website_label: raw.label,
        element_type: raw.element_type,
        input_type: raw.input_type,
        canonical_field: "guardian_name",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["guardian_name"]?.label || "Guardian's Name",
        confidence: 0.95,
        source: "context",
        needs_confirmation: false,
        status: "approved",
        required: Boolean(raw.required),
      };
    }

    if (
      fullCombinedText.includes("bank") ||
      fullCombinedText.includes("account") ||
      fullCombinedText.includes("passbook") ||
      fullCombinedText.includes("beneficiary")
    ) {
      return {
        field_id: raw.field_id,
        website_label: raw.label,
        element_type: raw.element_type,
        input_type: raw.input_type,
        canonical_field: "account_holder_name",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["account_holder_name"]?.label || "Bank Account Holder Name",
        confidence: 0.95,
        source: "context",
        needs_confirmation: false,
        status: "approved",
        required: Boolean(raw.required),
      };
    }

    if (
      normLabel !== "name" ||
      fullCombinedText.includes("candidate") ||
      fullCombinedText.includes("applicant") ||
      fullCombinedText.includes("student") ||
      fullCombinedText.includes("personal")
    ) {
      return {
        field_id: raw.field_id,
        website_label: raw.label,
        element_type: raw.element_type,
        input_type: raw.input_type,
        canonical_field: "full_name",
        canonical_display_name: CANONICAL_FIELD_DICTIONARY["full_name"]?.label || "Full Name",
        confidence: normLabel === "name" ? 0.85 : 0.99,
        source: normLabel === "name" ? "context" : "alias",
        needs_confirmation: false,
        status: "approved",
        required: Boolean(raw.required),
      };
    }

    // Completely ambiguous "Name" with zero context
    return {
      field_id: raw.field_id,
      website_label: raw.label,
      element_type: raw.element_type,
      input_type: raw.input_type,
      canonical_field: null,
      canonical_display_name: "Ambiguous Name Field",
      confidence: 0.5,
      source: "unknown",
      needs_confirmation: true,
      status: "pending",
      alternatives: ["full_name", "first_name", "father_name", "mother_name"],
      required: Boolean(raw.required),
    };
  }

  // 4. Exact Alias Lookup across label, name, id, placeholder
  const candidateTexts = [normLabel, normName, normId, normPlaceholder, normAria].filter(Boolean);

  for (const text of candidateTexts) {
    if (DIRECT_ALIAS_MAP.has(text)) {
      const canonicalKey = DIRECT_ALIAS_MAP.get(text)!;
      const def = CANONICAL_FIELD_DICTIONARY[canonicalKey];
      return {
        field_id: raw.field_id,
        website_label: raw.label || raw.placeholder || raw.name || canonicalKey,
        element_type: raw.element_type,
        input_type: raw.input_type,
        canonical_field: canonicalKey,
        canonical_display_name: def?.label || canonicalKey,
        confidence: 0.99,
        source: "alias",
        needs_confirmation: false,
        status: "approved",
        options: raw.options,
        required: Boolean(raw.required),
      };
    }
  }

  // 5. Contextual Substring Matching
  for (const [alias, canonicalKey] of DIRECT_ALIAS_MAP.entries()) {
    if (alias.length >= 4) {
      if (normLabel.includes(alias) || alias.includes(normLabel)) {
        const def = CANONICAL_FIELD_DICTIONARY[canonicalKey];
        return {
          field_id: raw.field_id,
          website_label: raw.label,
          element_type: raw.element_type,
          input_type: raw.input_type,
          canonical_field: canonicalKey,
          canonical_display_name: def?.label || canonicalKey,
          confidence: 0.9,
          source: "alias",
          needs_confirmation: false,
          status: "approved",
          options: raw.options,
          required: Boolean(raw.required),
        };
      }
    }
  }

  // Fallback: check fullCombinedText against aliases
  for (const [alias, canonicalKey] of DIRECT_ALIAS_MAP.entries()) {
    if (alias.length >= 5 && fullCombinedText.includes(alias)) {
      const def = CANONICAL_FIELD_DICTIONARY[canonicalKey];
      return {
        field_id: raw.field_id,
        website_label: raw.label || raw.name || "Field",
        element_type: raw.element_type,
        input_type: raw.input_type,
        canonical_field: canonicalKey,
        canonical_display_name: def?.label || canonicalKey,
        confidence: 0.82,
        source: "context",
        needs_confirmation: false,
        status: "approved",
        options: raw.options,
        required: Boolean(raw.required),
      };
    }
  }

  // 6. Unknown / Unmapped Field
  return {
    field_id: raw.field_id,
    website_label: raw.label || raw.name || raw.id || "Unknown Field",
    element_type: raw.element_type,
    input_type: raw.input_type,
    canonical_field: null,
    canonical_display_name: "Unmapped Field",
    confidence: 0.4,
    source: "unknown",
    needs_confirmation: true,
    status: "pending",
    alternatives: ["full_name", "first_name", "date_of_birth", "father_name", "address", "phone", "email"],
    options: raw.options,
    required: Boolean(raw.required),
  };
}

export function mapDetectedFields(rawFields: RawDetectedField[]): SmartFieldMapping[] {
  return rawFields.map(mapDetectedField);
}
