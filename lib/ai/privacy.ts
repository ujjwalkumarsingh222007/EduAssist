/**
 * Privacy & Data Masking Utilities
 *
 * Enforces strict handling of sensitive Indian government IDs (Aadhaar, PAN, etc.)
 * and personally identifiable information (PII).
 */

const SENSITIVE_FIELD_NAMES = new Set([
  "aadhaar",
  "aadhaar_number",
  "aadhar",
  "aadhar_number",
  "uidai_number",
  "pan",
  "pan_number",
  "passport",
  "passport_number",
  "voter_id",
  "epic_number",
  "driving_license",
  "bank_account_number",
  "account_number",
  "ifsc_code",
  "caste_certificate_number",
  "income_certificate_number",
  "annual_income",
  "family_income",
]);

/**
 * Checks whether a given field name represents a sensitive piece of information
 */
export function isSensitiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[\s-]/g, "_");
  if (SENSITIVE_FIELD_NAMES.has(normalized)) return true;
  return (
    normalized.includes("aadhaar") ||
    normalized.includes("aadhar") ||
    normalized.includes("pan_") ||
    normalized.endsWith("_number") && (normalized.includes("id") || normalized.includes("card") || normalized.includes("cert"))
  );
}

/**
 * Mask sensitive values for display (e.g., Aadhaar -> XXXX-XXXX-1234, PAN -> XXXXX1234X)
 */
export function maskSensitiveValue(fieldName: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";

  const normalized = fieldName.toLowerCase().replace(/[\s-]/g, "_");

  // Aadhaar masking (12 digits -> XXXX-XXXX-1234)
  if (normalized.includes("aadhaar") || normalized.includes("aadhar")) {
    const digits = str.replace(/\D/g, "");
    if (digits.length >= 4) {
      const lastFour = digits.slice(-4);
      return `XXXX-XXXX-${lastFour}`;
    }
    return "XXXX-XXXX-XXXX";
  }

  // PAN masking (10 characters: ABCDE1234F -> XXXXX1234X)
  if (normalized.includes("pan")) {
    const clean = str.replace(/\s/g, "");
    if (clean.length === 10) {
      return `XXXXX${clean.slice(5, 9)}X`;
    }
    return "XXXXXXXXXX";
  }

  // General masking for long IDs or phone/bank
  if (str.length > 6) {
    const lastFour = str.slice(-4);
    return `${"•".repeat(str.length - 4)}${lastFour}`;
  }

  return "••••••";
}

/**
 * Strips all sensitive values from objects before any internal or external logging.
 * NEVER prints unmasked PII, names, or ID numbers to console.
 */
export function sanitizeForLogging(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveField(key)) {
      sanitized[key] = "[REDACTED_SENSITIVE_FIELD]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
