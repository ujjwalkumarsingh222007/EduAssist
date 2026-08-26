import { normalizeDate } from "./normalizer";

export type ExpiryStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRY_INFORMATION";

export interface DocumentExpiryReport {
  document_id: string;
  document_name: string;
  document_type: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  status: ExpiryStatus;
  days_remaining?: number | null;
  status_label: string;
  badge_color: "green" | "yellow" | "red" | "gray";
  recommendation?: string;
  reminder_needed: boolean;
  reminder_type?: "30_days" | "7_days" | "1_day" | "expired" | null;
}

export interface ExpiryAnalysisSummary {
  total_documents: number;
  active_count: number;
  expiring_soon_count: number;
  expired_count: number;
  no_expiry_count: number;
  reports: DocumentExpiryReport[];
  checked_at: string;
}

const DEFAULT_EXPIRING_THRESHOLD_DAYS = 30;

/**
 * Extracts issue and expiry dates from extracted document data.
 */
export function extractDocumentDates(
  extractedData?: Record<string, unknown> | null,
  documentType?: string
): { issue_date: string | null; expiry_date: string | null } {
  if (!extractedData) return { issue_date: null, expiry_date: null };

  let rawIssue: unknown = null;
  let rawExpiry: unknown = null;

  const fields = (extractedData.fields as Record<string, unknown>) || extractedData;

  // Search fields dictionary
  if (fields.issue_date) rawIssue = fields.issue_date;
  if (fields.certificate_date) rawIssue = rawIssue || fields.certificate_date;
  if (fields.expiry_date) rawExpiry = fields.expiry_date;
  if (fields.valid_upto) rawExpiry = rawExpiry || fields.valid_upto;
  if (fields.valid_until) rawExpiry = rawExpiry || fields.valid_until;
  if (fields.renewal_date) rawExpiry = rawExpiry || fields.renewal_date;

  // Search nested objects
  if (extractedData.financial && typeof extractedData.financial === "object") {
    const fin = extractedData.financial as Record<string, unknown>;
    if (fin.issue_date) rawIssue = rawIssue || fin.issue_date;
    if (fin.valid_upto) rawExpiry = rawExpiry || fin.valid_upto;
  }

  if (extractedData.person && typeof extractedData.person === "object") {
    const person = extractedData.person as Record<string, unknown>;
    if (person.issue_date) rawIssue = rawIssue || person.issue_date;
    if (person.expiry_date) rawExpiry = rawExpiry || person.expiry_date;
  }

  // Handle value-wrapped objects
  if (rawIssue && typeof rawIssue === "object" && "value" in rawIssue) {
    rawIssue = (rawIssue as { value: unknown }).value;
  }
  if (rawExpiry && typeof rawExpiry === "object" && "value" in rawExpiry) {
    rawExpiry = (rawExpiry as { value: unknown }).value;
  }

  const normIssue = normalizeDate(rawIssue ? String(rawIssue) : null);
  const normExpiry = normalizeDate(rawExpiry ? String(rawExpiry) : null);

  // Critical: Marksheets, Degrees, and Diplomas do not expire
  const docTypeUpper = (documentType || "").toUpperCase();
  if (
    docTypeUpper.includes("MARKSHEET") ||
    docTypeUpper.includes("DEGREE") ||
    docTypeUpper.includes("TRANSCRIPT")
  ) {
    return { issue_date: normIssue, expiry_date: null };
  }

  return {
    issue_date: normIssue,
    expiry_date: normExpiry,
  };
}

/**
 * Evaluates document expiry status based on extracted expiry date and configurable threshold.
 */
export function evaluateDocumentExpiry(
  documentId: string,
  documentName: string,
  documentType: string,
  extractedData?: Record<string, unknown> | null,
  thresholdDays: number = DEFAULT_EXPIRING_THRESHOLD_DAYS,
  referenceDate: Date = new Date()
): DocumentExpiryReport {
  const { issue_date, expiry_date } = extractDocumentDates(extractedData, documentType);

  if (!expiry_date) {
    return {
      document_id: documentId,
      document_name: documentName,
      document_type: documentType,
      issue_date,
      expiry_date: null,
      status: "NO_EXPIRY_INFORMATION",
      days_remaining: null,
      status_label: "No expiry detected",
      badge_color: "gray",
      recommendation: "Document is lifelong or does not require scheduled renewal.",
      reminder_needed: false,
    };
  }

  const expiry = new Date(expiry_date);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const expiredAgo = Math.abs(diffDays);
    return {
      document_id: documentId,
      document_name: documentName,
      document_type: documentType,
      issue_date,
      expiry_date,
      status: "EXPIRED",
      days_remaining: diffDays,
      status_label: expiredAgo === 1 ? "Expired yesterday" : `Expired ${expiredAgo} days ago`,
      badge_color: "red",
      recommendation: "This certificate has expired. Renew with the issuing authority before submitting applications.",
      reminder_needed: true,
      reminder_type: "expired",
    };
  }

  if (diffDays <= thresholdDays) {
    let remType: "30_days" | "7_days" | "1_day" = "30_days";
    if (diffDays <= 1) remType = "1_day";
    else if (diffDays <= 7) remType = "7_days";

    return {
      document_id: documentId,
      document_name: documentName,
      document_type: documentType,
      issue_date,
      expiry_date,
      status: "EXPIRING_SOON",
      days_remaining: diffDays,
      status_label: diffDays === 0 ? "Expires today" : diffDays === 1 ? "Expires tomorrow" : `Expires in ${diffDays} days`,
      badge_color: "yellow",
      recommendation: `Certificate will expire soon (on ${expiry_date}). Prepare renewal documents in advance.`,
      reminder_needed: true,
      reminder_type: remType,
    };
  }

  return {
    document_id: documentId,
    document_name: documentName,
    document_type: documentType,
    issue_date,
    expiry_date,
    status: "ACTIVE",
    days_remaining: diffDays,
    status_label: `Valid until ${expiry_date}`,
    badge_color: "green",
    recommendation: "Document is active and valid for application submissions.",
    reminder_needed: false,
  };
}

/**
 * Analyzes all user documents for expiration and validity.
 */
export function performExpiryAudit(
  documents: { id: string; file_name: string; document_type: string; extracted_data?: Record<string, unknown> | null }[],
  thresholdDays: number = DEFAULT_EXPIRING_THRESHOLD_DAYS
): ExpiryAnalysisSummary {
  const reports: DocumentExpiryReport[] = documents.map((doc) =>
    evaluateDocumentExpiry(doc.id, doc.file_name, doc.document_type, doc.extracted_data, thresholdDays)
  );

  let activeCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;
  let noExpiryCount = 0;

  for (const rep of reports) {
    if (rep.status === "ACTIVE") activeCount++;
    else if (rep.status === "EXPIRING_SOON") expiringSoonCount++;
    else if (rep.status === "EXPIRED") expiredCount++;
    else noExpiryCount++;
  }

  return {
    total_documents: documents.length,
    active_count: activeCount,
    expiring_soon_count: expiringSoonCount,
    expired_count: expiredCount,
    no_expiry_count: noExpiryCount,
    reports,
    checked_at: new Date().toISOString(),
  };
}
