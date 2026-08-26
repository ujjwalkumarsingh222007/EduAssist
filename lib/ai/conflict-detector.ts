import { Profile, ProfileData, FieldConflictEntry } from "../types/profile";
import { normalizeDateToISO } from "./validator";

export function detectProfileConflicts(
  existingProfile: Profile | null,
  newFields: Record<string, { value: unknown; label: string; confidence: number; is_sensitive?: boolean }>,
  sourceDocumentName: string
): FieldConflictEntry[] {
  if (!existingProfile) return [];

  const conflicts: FieldConflictEntry[] = [];
  const pData: ProfileData = existingProfile.profile_data || {};
  const confirmed = pData.confirmed_fields || {};

  // 1. Date of birth check
  if (newFields.date_of_birth && newFields.date_of_birth.value) {
    const existingDob = existingProfile.date_of_birth || pData.personal?.date_of_birth || confirmed.date_of_birth?.value;
    const newDob = normalizeDateToISO(String(newFields.date_of_birth.value));

    if (existingDob && newDob && existingDob !== newDob) {
      conflicts.push({
        field_key: "date_of_birth",
        field_label: "Date of Birth",
        existing_value: existingDob,
        existing_source: confirmed.date_of_birth?.source_document || "Profile Record",
        new_value: newDob,
        new_source: sourceDocumentName,
        detected_at: new Date().toISOString(),
      });
    }
  }

  // 2. Full Name check (significant discrepancy)
  if (newFields.full_name && newFields.full_name.value) {
    const existingName = (existingProfile.full_name || pData.personal?.full_name || confirmed.full_name?.value || "").trim().toLowerCase();
    const newName = String(newFields.full_name.value).trim().toLowerCase();

    if (existingName && newName && existingName !== newName) {
      // Check if not just a partial initial variation
      const wordsExisting = existingName.split(/\s+/);
      const wordsNew = newName.split(/\s+/);
      const isSubset = wordsExisting.every((w) => wordsNew.includes(w)) || wordsNew.every((w) => wordsExisting.includes(w));

      if (!isSubset) {
        conflicts.push({
          field_key: "full_name",
          field_label: "Full Name",
          existing_value: existingProfile.full_name || pData.personal?.full_name || "",
          existing_source: confirmed.full_name?.source_document || "Profile Record",
          new_value: String(newFields.full_name.value),
          new_source: sourceDocumentName,
          detected_at: new Date().toISOString(),
        });
      }
    }
  }

  // 3. Father's Name check
  if (newFields.father_name && newFields.father_name.value) {
    const existingFather = (pData.family?.father_name || confirmed.father_name?.value || "").trim().toLowerCase();
    const newFather = String(newFields.father_name.value).trim().toLowerCase();

    if (existingFather && newFather && existingFather !== newFather) {
      conflicts.push({
        field_key: "father_name",
        field_label: "Father's Name",
        existing_value: pData.family?.father_name || "",
        existing_source: confirmed.father_name?.source_document || "Profile Record",
        new_value: String(newFields.father_name.value),
        new_source: sourceDocumentName,
        detected_at: new Date().toISOString(),
      });
    }
  }

  // 4. Social Category check
  if (newFields.category && newFields.category.value) {
    const existingCat = (pData.eligibility?.category || confirmed.category?.value || "").trim().toLowerCase();
    const newCat = String(newFields.category.value).trim().toLowerCase();

    if (existingCat && newCat && existingCat !== newCat) {
      conflicts.push({
        field_key: "category",
        field_label: "Social Category",
        existing_value: pData.eligibility?.category || "",
        existing_source: confirmed.category?.source_document || "Profile Record",
        new_value: String(newFields.category.value),
        new_source: sourceDocumentName,
        detected_at: new Date().toISOString(),
      });
    }
  }

  return conflicts;
}
