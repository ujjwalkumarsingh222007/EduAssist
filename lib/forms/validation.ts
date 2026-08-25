import { ApplicationFormSchema, ApplicationFormData, FormCompletionStats, InternalFormField } from "./schema";

export function calculateFormCompletionStats(
  schema: ApplicationFormSchema,
  formData: ApplicationFormData
): FormCompletionStats {
  let totalFields = 0;
  let requiredFields = 0;
  let filledFields = 0;
  let profileFilledFields = 0;
  let missingRequiredFields = 0;

  schema.sections.forEach((sec) => {
    sec.fields.forEach((field) => {
      totalFields++;
      if (field.required) requiredFields++;

      const entry = formData[field.id];
      const hasValue = entry && entry.value !== null && entry.value !== undefined && (
        Array.isArray(entry.value) ? entry.value.length > 0 : String(entry.value).trim() !== ""
      );

      if (hasValue) {
        filledFields++;
        if (entry.is_from_profile) profileFilledFields++;
      } else if (field.required) {
        missingRequiredFields++;
      }
    });
  });

  const completionPercentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return {
    total_fields: totalFields,
    required_fields: requiredFields,
    filled_fields: filledFields,
    profile_filled_fields: profileFilledFields,
    missing_required_fields: missingRequiredFields,
    completion_percentage: completionPercentage,
  };
}

export interface ReviewFieldItem {
  field: InternalFormField;
  sectionName: string;
  value: string | string[] | null;
  is_from_profile: boolean;
  is_missing: boolean;
  is_sensitive: boolean;
}

export function getApplicationReviewBreakdown(
  schema: ApplicationFormSchema,
  formData: ApplicationFormData
): {
  filledItems: ReviewFieldItem[];
  missingItems: ReviewFieldItem[];
} {
  const filledItems: ReviewFieldItem[] = [];
  const missingItems: ReviewFieldItem[] = [];

  schema.sections.forEach((sec) => {
    sec.fields.forEach((field) => {
      const entry = formData[field.id];
      const hasValue = entry && entry.value !== null && entry.value !== undefined && (
        Array.isArray(entry.value) ? entry.value.length > 0 : String(entry.value).trim() !== ""
      );

      const item: ReviewFieldItem = {
        field,
        sectionName: sec.name,
        value: entry?.value ?? null,
        is_from_profile: entry?.is_from_profile ?? false,
        is_missing: !hasValue,
        is_sensitive: field.is_sensitive ?? false,
      };

      if (hasValue) {
        filledItems.push(item);
      } else if (field.required) {
        missingItems.push(item);
      }
    });
  });

  return { filledItems, missingItems };
}
