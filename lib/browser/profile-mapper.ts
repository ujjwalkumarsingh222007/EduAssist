import { LiveFormFieldDescriptor, FormFieldFillResult } from "./types";
import { Profile } from "@/lib/types/profile";
import { toCanonicalProfile } from "@/lib/profile/canonical-profile";
import { transformProfileField } from "@/lib/profile/field-transformer";

/**
 * Maps a single live DOM field from the controlled Playwright page
 * against the student's normalized canonical profile.
 */
export function mapLiveFieldToVerifiedProfile(
  field: LiveFormFieldDescriptor,
  profile: Profile | null
): FormFieldFillResult {
  // 1. Security Challenge Guard (CAPTCHA / OTP / Passwords)
  if (field.is_security_challenge) {
    return {
      selector: field.selector,
      field_name: field.name,
      field_label: field.label,
      field_type: field.type,
      filled_value: null,
      status: "security_challenge",
      notes: "CAPTCHA, OTP, or security authentication challenge. Must be completed manually.",
    };
  }

  if (!profile) {
    return {
      selector: field.selector,
      field_name: field.name,
      field_label: field.label,
      field_type: field.type,
      filled_value: null,
      status: "needs_user_input",
      notes: "No verified profile loaded.",
    };
  }

  // 2. Convert to Canonical Profile Data Model
  const canonical = toCanonicalProfile(profile);

  // 3. Search candidate target identifiers (Label > Name > ID > Placeholder)
  const candidateLabels = [
    field.label,
    field.name || "",
    field.id || "",
    field.placeholder || "",
  ].filter(Boolean);

  let bestResult = null;

  for (const labelCandidate of candidateLabels) {
    const res = transformProfileField(canonical, labelCandidate, {
      fieldType: field.type,
      placeholder: field.placeholder,
      selectOptions: field.options,
    });

    if (res.confidence >= 0.70 && res.value !== null) {
      bestResult = res;
      break;
    }
  }

  if (bestResult && bestResult.value !== null && bestResult.confidence >= 0.70) {
    return {
      selector: field.selector,
      field_name: field.name,
      field_label: field.label,
      field_type: field.type,
      matched_profile_field: bestResult.canonicalKey || undefined,
      filled_value: bestResult.value,
      display_value: bestResult.isSensitive ? "••••••••" : bestResult.value,
      status: "filled",
      notes: `Confidence: ${(bestResult.confidence * 100).toFixed(0)}% (${bestResult.source})`,
    };
  }

  // 4. Leave empty if no high confidence match (Zero guessing)
  return {
    selector: field.selector,
    field_name: field.name,
    field_label: field.label,
    field_type: field.type,
    filled_value: null,
    status: "needs_user_input",
    notes: "Requires student manual input.",
  };
}
