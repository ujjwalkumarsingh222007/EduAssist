"use client";

import { useState } from "react";
import { ExtractionResult } from "@/lib/types/extraction";
import { StudentDocument } from "@/lib/types/document";
import { ProfileData, MarksheetTable, VerifiedCertificate } from "@/lib/types/profile";
import { createClient } from "@/lib/supabase/client";
import { isSensitiveField, maskSensitiveValue } from "@/lib/ai/privacy";
import {
  X,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Table,
  FileText,
  Save,
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
  const extraction = (document?.extracted_data as unknown as ExtractionResult) || null;

  // Initialize editable fields from extracted fields
  const [editedFields, setEditedFields] = useState<Record<string, string>>(() => {
    if (!extraction?.fields) return {};
    const initial: Record<string, string> = {};
    for (const [key, field] of Object.entries(extraction.fields)) {
      initial[key] = field?.value !== null && field?.value !== undefined ? String(field.value) : "";
    }
    return initial;
  });

  // State to track which sensitive fields are unmasked for viewing/editing
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
      .replace(/Icsc/i, "ICSE");
  }

  function getConfidenceBadge(confidenceScore?: number) {
    const score = confidenceScore ?? 0.9;
    const percent = Math.round(score * 100);

    if (score >= 0.9) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          High • {percent}%
        </span>
      );
    }
    if (score >= 0.7) {
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

  function toggleShowSensitive(key: string) {
    setShowSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleFieldChange(key: string, value: string) {
    setEditedFields((prev) => ({ ...prev, [key]: value }));
  }

  function normalizeDateToISO(val?: string | null): string | null {
    if (!val) return null;
    const str = val.trim();
    if (!str) return null;

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, "0");
      const month = dmyMatch[2].padStart(2, "0");
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // YYYY/MM/DD or YYYY.MM.DD
    const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, "0");
      const day = ymdMatch[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // Fallback Date parser (e.g. "15 August 2006", "Aug 15, 2006")
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      if (y >= 1900 && y <= 2100) {
        return `${y}-${m}-${d}`;
      }
    }

    return null;
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

      // Fetch existing profile record to merge data safely
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const existingProfileData: ProfileData = existingProfile?.profile_data || {};

      // 1. Map standard top-level columns
      const rawFullName =
        editedFields.full_name ||
        editedFields.student_name ||
        editedFields.name ||
        editedFields.candidate_name ||
        "";

      const rawDob =
        editedFields.date_of_birth ||
        editedFields.dob ||
        editedFields.birth_date ||
        "";

      const rawGender =
        editedFields.gender ||
        editedFields.sex ||
        "";

      const rawPhone =
        editedFields.phone ||
        editedFields.phone_number ||
        editedFields.mobile ||
        editedFields.mobile_number ||
        "";

      const rawAddress =
        editedFields.address ||
        editedFields.permanent_address ||
        editedFields.current_address ||
        editedFields.residential_address ||
        "";

      const rawCity = editedFields.city || editedFields.district || "";
      const rawState = editedFields.state || "";
      const rawCountry = editedFields.country || "India";
      const normalizedDob = normalizeDateToISO(rawDob) || existingProfile?.date_of_birth || null;

      // 2. Build structured profile_data JSONB object
      const newPersonal = {
        ...(existingProfileData.personal || {}),
        pincode: editedFields.pincode || editedFields.pin_code || existingProfileData.personal?.pincode || "",
        nationality: editedFields.nationality || existingProfileData.personal?.nationality || "Indian",
        blood_group: editedFields.blood_group || existingProfileData.personal?.blood_group || "",
      };

      const newFamily = {
        ...(existingProfileData.family || {}),
        father_name: editedFields.father_name || editedFields.fathers_name || existingProfileData.family?.father_name || "",
        mother_name: editedFields.mother_name || editedFields.mothers_name || existingProfileData.family?.mother_name || "",
        guardian_name: editedFields.guardian_name || existingProfileData.family?.guardian_name || "",
      };

      const newIdentity = {
        ...(existingProfileData.identity || {}),
        aadhaar_number: editedFields.aadhaar_number || editedFields.aadhaar || editedFields.aadhar_number || existingProfileData.identity?.aadhaar_number || "",
        pan_number: editedFields.pan_number || editedFields.pan || existingProfileData.identity?.pan_number || "",
        passport_number: editedFields.passport_number || editedFields.passport || existingProfileData.identity?.passport_number || "",
        voter_id: editedFields.voter_id || editedFields.epic_number || existingProfileData.identity?.voter_id || "",
      };

      const newEducation = {
        ...(existingProfileData.education || {}),
        institution_name: editedFields.institution_name || editedFields.school_name || editedFields.college_name || existingProfileData.education?.institution_name || "",
        university_name: editedFields.university_name || editedFields.board_name || existingProfileData.education?.university_name || "",
        degree: editedFields.degree || editedFields.degree_name || existingProfileData.education?.degree || "",
        course: editedFields.course || editedFields.course_name || existingProfileData.education?.course || "",
        branch: editedFields.branch || editedFields.branch_stream || existingProfileData.education?.branch || "",
        roll_number: editedFields.roll_number || editedFields.roll_no || existingProfileData.education?.roll_number || "",
        enrollment_number: editedFields.enrollment_number || editedFields.enrollment_no || existingProfileData.education?.enrollment_number || "",
        registration_number: editedFields.registration_number || existingProfileData.education?.registration_number || "",
        academic_year: editedFields.academic_year || editedFields.year || existingProfileData.education?.academic_year || "",
        graduation_year: editedFields.graduation_year || existingProfileData.education?.graduation_year || "",
        cgpa: editedFields.cgpa || editedFields.sgpa || existingProfileData.education?.cgpa || "",
        percentage: editedFields.percentage || existingProfileData.education?.percentage || "",
      };

      const newEligibility = {
        ...(existingProfileData.eligibility || {}),
        annual_income: editedFields.annual_income || editedFields.annual_family_income || editedFields.family_income || existingProfileData.eligibility?.annual_income || "",
        category: editedFields.category || editedFields.caste_category || editedFields.caste || existingProfileData.eligibility?.category || "",
        domicile: editedFields.domicile || editedFields.domicile_state || existingProfileData.eligibility?.domicile || "",
      };

      // 3. Process Marksheets & Academic Results Table
      let updatedAcademicResults: MarksheetTable[] = [...(existingProfileData.academic_results || [])];
      if (extraction.tables && extraction.tables.length > 0) {
        const marksheetEntry: MarksheetTable = {
          id: document.id,
          source_document_name: document.file_name,
          examination_name: editedFields.examination_name || editedFields.exam_name || extraction.document_type || "Examination Result",
          board_name: editedFields.board_name || editedFields.university_name || "",
          institution_name: editedFields.institution_name || "",
          roll_number: editedFields.roll_number || "",
          year: editedFields.year || editedFields.academic_year || "",
          total_marks: editedFields.total_marks_obtained || editedFields.total_marks || "",
          maximum_marks: editedFields.maximum_marks || "",
          percentage: editedFields.percentage || "",
          cgpa: editedFields.cgpa || "",
          result: editedFields.result || editedFields.result_status || "PASS",
          subjects: extraction.tables[0]?.subjects || [],
        };

        // Filter out old entry for same document if re-confirming
        updatedAcademicResults = updatedAcademicResults.filter((item) => item.id !== document.id);
        updatedAcademicResults.unshift(marksheetEntry);
      }

      // 4. Process Certificate info if applicable
      let updatedCertificates: VerifiedCertificate[] = [...(existingProfileData.certificates || [])];
      if (
        editedFields.certificate_number ||
        editedFields.issuing_authority ||
        extraction.document_type?.toLowerCase().includes("certificate")
      ) {
        const certEntry: VerifiedCertificate = {
          id: document.id,
          certificate_type: extraction.document_type || editedFields.certificate_type || "Certificate",
          certificate_number: editedFields.certificate_number || editedFields.cert_no || "",
          issuing_authority: editedFields.issuing_authority || editedFields.issuer || "",
          issue_date: normalizeDateToISO(editedFields.issue_date) || editedFields.issue_date || "",
          expiry_date: normalizeDateToISO(editedFields.expiry_date) || editedFields.expiry_date || "",
          category: editedFields.category || editedFields.caste_category || "",
          source_document_name: document.file_name,
        };

        updatedCertificates = updatedCertificates.filter((item) => item.id !== document.id);
        updatedCertificates.unshift(certEntry);
      }

      // 5. Source documents metadata tracking & dynamic confirmed fields map
      const existingSources = existingProfileData.meta?.source_documents || [];
      const updatedSources = [
        { id: document.id, name: document.file_name, confirmed_at: new Date().toISOString() },
        ...existingSources.filter((s) => s.id !== document.id),
      ];

      const previousConfirmed = existingProfileData.confirmed_fields || {};
      const newConfirmedFields: Record<string, { label: string; value: string; source_document?: string; confirmed_at?: string; is_sensitive?: boolean }> = { ...previousConfirmed };

      for (const [key, val] of Object.entries(editedFields)) {
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          newConfirmedFields[key] = {
            label: humanizeFieldName(key),
            value: String(val).trim(),
            source_document: document.file_name,
            confirmed_at: new Date().toISOString(),
            is_sensitive: isSensitiveField(key) || Boolean(extraction.fields?.[key]?.is_sensitive),
          };
        }
      }

      const mergedProfileData: ProfileData = {
        personal: newPersonal,
        family: newFamily,
        identity: newIdentity,
        education: newEducation,
        academic_results: updatedAcademicResults,
        certificates: updatedCertificates,
        eligibility: newEligibility,
        confirmed_fields: newConfirmedFields,
        meta: {
          source_documents: updatedSources,
          last_confirmed_at: new Date().toISOString(),
        },
      };

      // 6. Complete Profile Payload
      const profilePayload = {
        user_id: user.id,
        full_name: rawFullName.trim() || existingProfile?.full_name || user.user_metadata?.name || "Student",
        date_of_birth: normalizedDob,
        gender: rawGender.trim() || existingProfile?.gender || null,
        phone: rawPhone.trim() || existingProfile?.phone || null,
        address: rawAddress.trim() || existingProfile?.address || null,
        city: rawCity.trim() || existingProfile?.city || null,
        state: rawState.trim() || existingProfile?.state || null,
        country: rawCountry.trim() || existingProfile?.country || "India",
        profile_data: mergedProfileData,
        updated_at: new Date().toISOString(),
      };

      // 7. Save confirmed verified data into profiles table
      let { error: profileError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "user_id" });

      if (profileError && profileError.message?.includes("profile_data")) {
        const fallbackPayload: Record<string, unknown> = { ...profilePayload };
        delete fallbackPayload.profile_data;
        const res = await supabase.from("profiles").upsert(fallbackPayload, { onConflict: "user_id" });
        profileError = res.error;
      }

      if (profileError) {
        console.error("Profile update error:", profileError);
        setSaveError(
          profileError.message ||
            "Failed to save profile. Ensure 'profiles' table exists in Supabase."
        );
        setSaving(false);
        return;
      }

      // 8. Update the document record with user-confirmed fields
      const updatedExtraction = {
        ...extraction,
        fields: { ...extraction.fields },
        user_confirmed: true,
        confirmed_at: new Date().toISOString(),
      };

      for (const [key, val] of Object.entries(editedFields)) {
        if (updatedExtraction.fields[key]) {
          updatedExtraction.fields[key].value = val;
        }
      }

      await supabase
        .from("documents")
        .update({
          extracted_data: updatedExtraction,
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id);

      onConfirmSuccess(profilePayload.full_name);
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {extraction.document_type || "Extracted Information"}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {Math.round((extraction.confidence || 0.95) * 100)}% overall confidence
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                Source document: <span className="font-medium text-slate-700">{document.file_name}</span>
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
          {/* Important AI Notice Banner */}
          <div className="flex items-start gap-3 bg-amber-50/80 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Review before confirming</p>
              <p className="text-amber-800 text-xs mt-0.5">
                Please review the extracted information carefully. AI can make mistakes. You can edit any field before saving to your verified student profile.
              </p>
            </div>
          </div>

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
                Extracted Fields ({fieldsList.length})
              </h3>
              <span className="text-xs text-slate-400">Click any field to edit value</span>
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
                            <span title="Sensitive Government ID / Data">
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

          {/* Tables / Marks Breakdown Section (if present) */}
          {extraction.tables && extraction.tables.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Table className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Academic Marks & Subjects Breakdown
                </h3>
              </div>

              {extraction.tables.map((tbl, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 overflow-hidden mb-4 shadow-2xs"
                >
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-semibold text-xs text-slate-700">
                    {tbl.name || "Subject Details"}
                  </div>

                  {tbl.subjects && tbl.subjects.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2 font-semibold">Subject</th>
                            <th className="px-3.5 py-2 font-semibold text-center">Marks Obtained</th>
                            <th className="px-3.5 py-2 font-semibold text-center">Max Marks</th>
                            <th className="px-3.5 py-2 font-semibold text-center">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {tbl.subjects.map((sub, sIdx) => (
                            <tr key={sIdx} className="hover:bg-slate-50/50">
                              <td className="px-3.5 py-2 font-medium text-slate-800">
                                {sub.subject_name}
                              </td>
                              <td className="px-3.5 py-2 text-center text-slate-700">
                                {sub.marks_obtained ?? "—"}
                              </td>
                              <td className="px-3.5 py-2 text-center text-slate-500">
                                {sub.maximum_marks ?? "—"}
                              </td>
                              <td className="px-3.5 py-2 text-center">
                                <span className="font-semibold text-blue-600">
                                  {sub.grade ?? "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : tbl.rows && tbl.rows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        {tbl.headers && (
                          <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200">
                            <tr>
                              {tbl.headers.map((h, hIdx) => (
                                <th key={hIdx} className="px-3.5 py-2 font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {tbl.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3.5 py-2 text-slate-700">
                                  {String(cell ?? "—")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ))}
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
            Confirmed information will be saved directly into your verified student profile.
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
                  Confirm & Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
