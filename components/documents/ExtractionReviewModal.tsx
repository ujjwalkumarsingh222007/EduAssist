"use client";

import { useState, useEffect } from "react";
import { StudentDocument } from "@/lib/types/document";
import { Profile, FieldConflictEntry } from "@/lib/types/profile";
import { createClient } from "@/lib/supabase/client";
import { isSensitiveField, maskSensitiveValue } from "@/lib/ai/privacy";
import { UnifiedExtractionResult } from "@/lib/ai/extractor";
import { mapDocumentToProfile } from "@/lib/ai/profile-mapper";
import { detectProfileConflicts } from "@/lib/ai/conflict-detector";
import { getConfidenceTier } from "@/lib/ai/validator";
import {
  X,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Table,
  FileText,
  Save,
  GraduationCap,
  Briefcase,
  DollarSign,
  FileCheck,
} from "lucide-react";

interface ExtractionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: StudentDocument | null;
  onConfirmSuccess: (updatedProfileName?: string) => void;
}

export default function ExtractionReviewModal({
  isOpen,
  onClose,
  document,
  onConfirmSuccess,
}: ExtractionReviewModalProps) {
  const extraction = (document?.extracted_data as unknown as UnifiedExtractionResult) || null;

  // Editable fields state
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [existingProfile, setExistingProfile] = useState<Profile | null>(null);
  const [conflicts, setConflicts] = useState<FieldConflictEntry[]>([]);

  // Initialize fields and fetch profile for conflict detection
  useEffect(() => {
    if (!isOpen || !document || !extraction) return;

    // Populate initial fields
    const initial: Record<string, string> = {};
    if (extraction.fields) {
      for (const [key, field] of Object.entries(extraction.fields)) {
        initial[key] = field?.value !== null && field?.value !== undefined ? String(field.value) : "";
      }
    }
    setEditedFields(initial);

    // Fetch existing profile to detect conflicts
    async function loadProfileForConflictCheck() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setExistingProfile(profile);

          const fieldEntries: Record<string, { value: unknown; label: string; confidence: number }> = {};
          for (const [k, v] of Object.entries(extraction?.fields || {})) {
            fieldEntries[k] = {
              value: v.value,
              label: humanizeFieldName(k),
              confidence: v.confidence,
            };
          }

          const detected = detectProfileConflicts(profile, fieldEntries, document?.file_name || "Document");
          setConflicts(detected);
        }
      } catch (err) {
        console.error("Failed to load profile for conflict detection:", err);
      }
    }

    loadProfileForConflictCheck();
  }, [isOpen, document, extraction]);

  if (!isOpen || !document || !extraction) return null;

  function humanizeFieldName(key: string): string {
    return key
      .split(/[_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .replace(/Dob/i, "Date of Birth")
      .replace(/Id/i, "ID")
      .replace(/Pan/i, "PAN")
      .replace(/Cgpa/i, "CGPA")
      .replace(/Sgpa/i, "SGPA")
      .replace(/Cbse/i, "CBSE")
      .replace(/Icse/i, "ICSE")
      .replace(/Pincode/i, "PIN Code");
  }

  function getConfidenceBadge(confidenceScore?: number) {
    const score = confidenceScore ?? 0.88;
    const tier = getConfidenceTier(score);
    const percent = Math.round(score * 100);

    if (tier === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          High • {percent}%
        </span>
      );
    }
    if (tier === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          Medium • {percent}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
        Low • {percent}%
      </span>
    );
  }

  function getCategoryHeaderIcon() {
    switch (extraction.document_type) {
      case "CLASS_10_MARKSHEET":
      case "CLASS_12_MARKSHEET":
      case "UG_MARKSHEET":
      case "DIPLOMA_MARKSHEET":
        return <GraduationCap className="w-5 h-5 text-blue-600" />;
      case "INTERNSHIP_CERTIFICATE":
        return <Briefcase className="w-5 h-5 text-purple-600" />;
      case "INCOME_CERTIFICATE":
        return <DollarSign className="w-5 h-5 text-emerald-600" />;
      default:
        return <FileCheck className="w-5 h-5 text-blue-600" />;
    }
  }

  function getCategoryBadgeLabel() {
    switch (extraction.document_type) {
      case "CLASS_10_MARKSHEET":
        return "Class 10 Marksheet • Secondary Education";
      case "CLASS_12_MARKSHEET":
        return "Class 12 Marksheet • Senior Secondary Education";
      case "UG_MARKSHEET":
        return "Undergraduate / College Grade Sheet";
      case "DIPLOMA_MARKSHEET":
        return "Polytechnic / Diploma Marksheet";
      case "INTERNSHIP_CERTIFICATE":
        return "Internship / Work Experience Certificate";
      case "INCOME_CERTIFICATE":
        return "Income / Family Financial Certificate";
      case "IDENTITY_DOCUMENT":
        return "Identity Verification Document";
      default:
        return extraction.document_type || "Student Document";
    }
  }

  function toggleShowSensitive(key: string) {
    setShowSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleFieldChange(key: string, value: string) {
    setEditedFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleConfirmAndSave() {
    if (!document || !extraction) return;

    try {
      setSaving(true);
      setSaveError("");
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setSaveError("You must be signed in to save profile information.");
        setSaving(false);
        return;
      }

      // 1. Strict Semantic Profile Mapping with Zero Data Loss
      const { updatedProfilePayload, confirmedFieldsCount } = mapDocumentToProfile(
        user.id,
        existingProfile,
        extraction.document_type,
        document.id,
        document.file_name,
        editedFields,
        extraction.subjects || [],
        (extraction.custom_fields || {}) as Record<string, { value: unknown; raw_label?: string; confidence?: number; is_sensitive?: boolean }>
      );

      // 2. Persist to Supabase public.profiles table (strictly user-scoped)
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(updatedProfilePayload, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Profile upsert failed:", upsertError);
        setSaveError(`Database update failed: ${upsertError.message}`);
        setSaving(false);
        return;
      }

      // 3. Mark document status as confirmed
      await supabase
        .from("documents")
        .update({
          extraction_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id)
        .eq("user_id", user.id);

      onConfirmSuccess(updatedProfilePayload.full_name);
      onClose();
    } catch (err: unknown) {
      console.error("Confirm error:", err);
      setSaveError("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  const fieldsList = Object.entries(extraction.fields || {});

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              {getCategoryHeaderIcon()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {extraction.document_title || humanizeFieldName(extraction.document_type)}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {getCategoryBadgeLabel()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                Source: <span className="font-medium text-slate-700">{document.file_name}</span> • {Math.round((extraction.confidence || 0.9) * 100)}% confidence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Conflict Warnings (if any detected) */}
          {conflicts.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Profile Conflict Detected</span>
              </div>
              <p className="text-[11px] text-amber-800">
                The values in this document differ from your existing profile. Please verify before saving:
              </p>
              <div className="space-y-1.5 pt-1">
                {conflicts.map((c, idx) => (
                  <div key={idx} className="text-xs p-2 bg-white/80 rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-800">{c.field_label}:</span>{" "}
                      <span className="line-through text-slate-400 mr-2">{c.existing_value}</span>
                      <span className="font-bold text-emerald-700">{c.new_value} (from {document.file_name})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Warnings (if math mismatch) */}
          {extraction.validation && extraction.validation.issues.length > 0 && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Automatic Mathematics Verification</span>
              </div>
              {extraction.validation.issues.map((iss, i) => (
                <p key={i} className="text-blue-800 text-[11px]">
                  • {iss.message}
                </p>
              ))}
            </div>
          )}

          {/* Error Message */}
          {saveError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to save</p>
                <p className="text-red-700 text-xs mt-0.5">{saveError}</p>
              </div>
            </div>
          )}

          {/* Fields List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Extracted Information ({fieldsList.length} fields)
              </h3>
              <span className="text-xs text-slate-400">Click any field to edit before confirming</span>
            </div>

            {fieldsList.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No structured fields detected.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {fieldsList.map(([key, field]) => {
                  const isSensitive = isSensitiveField(key) || field?.is_sensitive;
                  const isShowing = showSensitive[key];
                  const rawValue = editedFields[key] ?? "";
                  const maskedVal = maskSensitiveValue(key, rawValue);

                  return (
                    <div
                      key={key}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition-colors shadow-2xs flex flex-col justify-between gap-2"
                    >
                      {/* Field Label & Indicators */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isSensitive && (
                            <span title="Sensitive Government ID / Financial Data">
                              <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            </span>
                          )}
                          <label
                            htmlFor={`field_${key}`}
                            className="text-xs font-semibold text-slate-700 truncate"
                            title={humanizeFieldName(key)}
                          >
                            {humanizeFieldName(key)}
                          </label>
                        </div>
                        <div className="shrink-0">{getConfidenceBadge(field?.confidence)}</div>
                      </div>

                      {/* Value Input */}
                      <div className="relative flex items-center">
                        <input
                          id={`field_${key}`}
                          type={isSensitive && !isShowing ? "password" : "text"}
                          value={isSensitive && !isShowing ? maskedVal : rawValue}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          readOnly={isSensitive && !isShowing}
                          className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${
                            isSensitive && !isShowing
                              ? "bg-slate-50 text-slate-600 border-slate-200 cursor-not-allowed font-mono text-xs"
                              : "bg-white text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          }`}
                        />
                        {isSensitive && (
                          <button
                            type="button"
                            onClick={() => toggleShowSensitive(key)}
                            title={isShowing ? "Hide sensitive value" : "Show sensitive value"}
                            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {isShowing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Structured Subjects Breakdown Table */}
          {extraction.subjects && extraction.subjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Table className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Academic Subjects & Scores Breakdown
                </h3>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Subject</th>
                        <th className="px-3.5 py-2.5 text-center">Marks Obtained</th>
                        <th className="px-3.5 py-2.5 text-center">Max Marks</th>
                        <th className="px-3.5 py-2.5 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {extraction.subjects.map((sub, sIdx) => (
                        <tr key={sIdx} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-2.5 font-medium text-slate-800">
                            {sub.name}
                          </td>
                          <td className="px-3.5 py-2.5 text-center text-slate-700 font-semibold">
                            {sub.marks_obtained ?? "—"}
                          </td>
                          <td className="px-3.5 py-2.5 text-center text-slate-500">
                            {sub.max_marks ?? "—"}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span className="font-semibold text-blue-600">
                              {sub.grade ?? "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Notes / Observation */}
          {extraction.notes && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p>{extraction.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 order-2 sm:order-1 text-center sm:text-left">
            Information will be strictly mapped into the designated profile section without cross-pollinating unrelated sections.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving to Profile...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Confirm Information
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
