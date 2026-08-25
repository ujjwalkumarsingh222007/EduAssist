import { isSensitiveField, maskSensitiveValue } from "@/lib/ai/privacy";

const SECURITY_CHALLENGE_KEYWORDS = [
  "captcha",
  "recaptcha",
  "hcaptcha",
  "turnstile",
  "security_code",
  "security_pin",
  "otp",
  "one_time_password",
  "two_factor",
  "2fa",
  "biometric",
  "signature",
  "fingerprint",
  "payment_pin",
  "cvv",
  "card_pin",
];

export function isSecurityChallengeField(fieldNameOrLabel: string): boolean {
  if (!fieldNameOrLabel) return false;
  const normalized = fieldNameOrLabel.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return SECURITY_CHALLENGE_KEYWORDS.some((kw) => normalized.includes(kw));
}

export function formatSafeDisplayValue(key: string, value: string | null): string | null {
  if (!value) return null;
  if (isSensitiveField(key)) {
    return maskSensitiveValue(key, value);
  }
  return value;
}

/**
 * Sanitizes form data before returning to avoid logging raw PII
 */
export function sanitizeLogMessage(message: string): string {
  return message
    .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "••••-••••-••••")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, "••••••••••")
    .replace(/\b\d{10}\b/g, "••••••••••");
}
