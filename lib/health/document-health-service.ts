import {
  performMultiDocumentConsistencyAudit,
  MultiDocumentAuditResult,
  MultiDocumentConflict,
  MatrixRow,
} from "./consistency-checker";
import { performExpiryAudit, ExpiryAnalysisSummary, DocumentExpiryReport } from "./expiry-checker";
import { Profile } from "../types/profile";

export interface DocumentHealthState {
  overall_status: "all_consistent" | "needs_attention" | "has_critical_mismatches";
  consistency: MultiDocumentAuditResult;
  expiry: ExpiryAnalysisSummary;
  dismissed_reminders?: string[];
  last_audited_at: string;
}

export interface UserDocumentItem {
  id: string;
  user_id: string;
  file_name: string;
  document_type: string;
  extraction_status?: string;
  extracted_data?: Record<string, unknown> | null;
  created_at?: string;
}

/**
 * Computes the full document health analysis for a specific user.
 * Strictly user-scoped.
 */
export function computeDocumentHealth(
  userId: string,
  userDocuments: UserDocumentItem[],
  existingProfile?: Profile | null,
  dismissedReminders: string[] = []
): DocumentHealthState {
  // 1. Filter documents strictly belonging to this user
  const userDocs = userDocuments.filter((d) => d.user_id === userId);

  // 2. Perform multi-document consistency audit
  const consistencyAudit = performMultiDocumentConsistencyAudit(
    userDocs.map((d) => ({
      id: d.id,
      file_name: d.file_name,
      document_type: d.document_type,
      extracted_data: d.extracted_data,
    }))
  );

  // 3. Perform document expiry and validity audit
  const expirySummary = performExpiryAudit(
    userDocs.map((d) => ({
      id: d.id,
      file_name: d.file_name,
      document_type: d.document_type,
      extracted_data: d.extracted_data,
    }))
  );

  // 4. Determine overall system health status
  let overall: "all_consistent" | "needs_attention" | "has_critical_mismatches" = "all_consistent";

  if (consistencyAudit.overall_status === "has_critical_mismatches" || expirySummary.expired_count > 0) {
    overall = "has_critical_mismatches";
  } else if (consistencyAudit.overall_status === "needs_attention" || expirySummary.expiring_soon_count > 0) {
    overall = "needs_attention";
  }

  return {
    overall_status: overall,
    consistency: consistencyAudit,
    expiry: expirySummary,
    dismissed_reminders: dismissedReminders,
    last_audited_at: new Date().toISOString(),
  };
}
