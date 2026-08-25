import { ApplicationFormSchema, ApplicationFormData } from "./schema";

/**
 * Generates an official text application summary document ready for download/print
 */
export function generateApplicationExportText(
  schema: ApplicationFormSchema,
  formData: ApplicationFormData,
  studentName?: string
): string {
  const lines: string[] = [];

  lines.push("================================================================================");
  lines.push(`APPLICATION SUMMARY: ${schema.application_name.toUpperCase()}`);
  if (schema.provider) lines.push(`Provider: ${schema.provider}`);
  lines.push(`Official Destination URL: ${schema.source_url}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("================================================================================");
  lines.push("");
  lines.push("IMPORTANT NOTICE:");
  lines.push("This document is an assisted summary of your application generated using your verified");
  lines.push("profile data on EduAssist. Please review every field before submitting on the official portal.");
  lines.push("");

  schema.sections.forEach((sec) => {
    lines.push(`--------------------------------------------------------------------------------`);
    lines.push(`SECTION: ${sec.name.toUpperCase()}`);
    lines.push(`--------------------------------------------------------------------------------`);

    sec.fields.forEach((field) => {
      const entry = formData[field.id];
      let valStr = "— [Not Entered]";

      if (entry && entry.value !== null && entry.value !== undefined) {
        if (Array.isArray(entry.value)) {
          valStr = entry.value.join(", ") || "— [None]";
        } else if (String(entry.value).trim() !== "") {
          valStr = String(entry.value).trim();
        }
      }

      const verifiedTag = entry?.is_from_profile ? " [✓ Verified from Profile]" : "";
      lines.push(`${field.label}: ${valStr}${verifiedTag}`);
    });
    lines.push("");
  });

  lines.push("================================================================================");
  lines.push("NEXT STEPS FOR OFFICIAL SUBMISSION:");
  lines.push(`1. Open the official application URL: ${schema.source_url}`);
  lines.push("2. Enter or verify the fields matching this generated application summary.");
  lines.push("3. Complete any required security challenges (CAPTCHA, OTP verification).");
  lines.push("4. Attach required documents and submit directly on the official authority portal.");
  lines.push("================================================================================");

  return lines.join("\n");
}
