"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  FileText,
  RotateCcw,
  Trash2,
  Check,
  Loader2,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Upload,
} from "lucide-react";
import {
  ApplicationFormRecord,
  ApplicationFormData,
  InternalFormField,
  InternalFormSection,
} from "@/lib/forms/schema";
import { calculateFormCompletionStats, getApplicationReviewBreakdown } from "@/lib/forms/validation";
import { generateApplicationExportText } from "@/lib/forms/generator";
import { createClient } from "@/lib/supabase/client";

export default function ApplicationFormEditorPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params?.id as string;

  const [formRecord, setFormRecord] = useState<ApplicationFormRecord | null>(null);
  const [formData, setFormData] = useState<ApplicationFormData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [userDocs, setUserDocs] = useState<{ id: string; file_name: string; document_type: string }[]>([]);

  // Load Form from DB or Session Storage fallback
  useEffect(() => {
    async function loadForm() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Load user uploaded documents for linking
        const { data: docs } = await supabase
          .from("documents")
          .select("id, file_name, document_type")
          .order("created_at", { ascending: false });
        if (docs) setUserDocs(docs);

        // Fetch application record from Supabase
        const { data, error } = await supabase
          .from("application_forms")
          .select("*")
          .eq("id", formId)
          .maybeSingle();

        if (data && data.form_schema) {
          setFormRecord(data as ApplicationFormRecord);
          setFormData(data.form_data || {});
          if (data.form_schema.sections?.length > 0) {
            setActiveSectionId(data.form_schema.sections[0].id);
          }
        } else {
          // Check session storage fallback
          const cached = sessionStorage.getItem(`form_${formId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setFormRecord(parsed);
            setFormData(parsed.form_data || {});
            if (parsed.form_schema?.sections?.length > 0) {
              setActiveSectionId(parsed.form_schema.sections[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading application form:", err);
      } finally {
        setLoading(false);
      }
    }

    if (formId) loadForm();
  }, [formId]);

  if (loading) {
    return (
      <div className="p-12 text-center max-w-4xl mx-auto space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Loading your application form...</p>
      </div>
    );
  }

  if (!formRecord) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center space-y-4 bg-white rounded-2xl border border-slate-200 mt-6">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Application Form Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested application form could not be loaded or has expired.
        </p>
        <Link
          href="/dashboard/forms"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Form Assistant
        </Link>
      </div>
    );
  }

  const schema = formRecord.form_schema;
  const stats = calculateFormCompletionStats(schema, formData);
  const reviewBreakdown = getApplicationReviewBreakdown(schema, formData);

  // Field change handlers
  function handleFieldChange(fieldId: string, value: string | string[] | null) {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: {
        value,
        is_from_profile: prev[fieldId]?.is_from_profile ?? false,
        is_sensitive: prev[fieldId]?.is_sensitive ?? false,
      },
    }));
  }

  function handleResetField(field: InternalFormField) {
    const origPrefilled = formRecord!.form_data[field.id];
    setFormData((prev) => ({
      ...prev,
      [field.id]: {
        value: origPrefilled?.value ?? null,
        is_from_profile: origPrefilled?.is_from_profile ?? false,
        is_sensitive: field.is_sensitive ?? false,
      },
    }));
  }

  function handleClearAll() {
    if (!confirm("Are you sure you want to clear all form fields?")) return;
    const cleared: ApplicationFormData = {};
    schema.sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        cleared[f.id] = { value: null, is_from_profile: false };
      });
    });
    setFormData(cleared);
  }

  function toggleSensitive(fieldId: string) {
    setShowSensitive((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  }

  async function handleSaveDraft(markCompleted = false) {
    try {
      setSaving(true);
      setSaveSuccessMessage("");

      const newStatus = markCompleted ? "completed" : "draft";

      const res = await fetch("/api/forms/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formRecord!.id,
          form_data: formData,
          status: newStatus,
        }),
      });

      // Update cached session storage
      const updatedRecord = {
        ...formRecord!,
        form_data: formData,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      sessionStorage.setItem(`form_${formRecord!.id}`, JSON.stringify(updatedRecord));
      setFormRecord(updatedRecord as ApplicationFormRecord);

      setSaveSuccessMessage(markCompleted ? "Application marked as completed!" : "Draft saved successfully!");
      setTimeout(() => setSaveSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadSummary() {
    const textContent = generateApplicationExportText(schema, formData);
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${schema.application_name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_summary.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Render individual input control
  function renderFieldControl(field: InternalFormField) {
    const entry = formData[field.id];
    const rawVal = entry?.value;
    const isSens = field.is_sensitive || entry?.is_sensitive;
    const isShowing = showSensitive[field.id];

    // File / Document upload control
    if (field.type === "file" || field.is_document_upload) {
      const selectedDocName = typeof rawVal === "string" ? rawVal : "";

      return (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedDocName}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:border-blue-500 outline-none"
            >
              <option value="">-- Select from your verified documents --</option>
              {userDocs.map((doc) => (
                <option key={doc.id} value={doc.file_name}>
                  {doc.file_name} ({doc.document_type})
                </option>
              ))}
            </select>

            <Link
              href="/dashboard/documents"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload New
            </Link>
          </div>

          {selectedDocName ? (
            <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Linked: <strong>{selectedDocName}</strong>
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              Link an uploaded document from your repository to attach with this application.
            </p>
          )}
        </div>
      );
    }

    // Select dropdown
    if (field.type === "select" && field.options) {
      return (
        <select
          id={field.id}
          value={typeof rawVal === "string" ? rawVal : ""}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white focus:border-blue-500 outline-none"
        >
          <option value="">-- Select an option --</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    // Textarea
    if (field.type === "textarea") {
      return (
        <textarea
          id={field.id}
          rows={3}
          value={typeof rawVal === "string" ? rawVal : ""}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          placeholder={field.placeholder || "Enter details..."}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:border-blue-500 outline-none resize-y"
        />
      );
    }

    // Standard Text / Date / Number / Email / Tel
    return (
      <div className="relative">
        <input
          id={field.id}
          type={isSens && !isShowing ? "password" : field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          value={rawVal === null || rawVal === undefined ? "" : Array.isArray(rawVal) ? rawVal.join(", ") : String(rawVal)}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          placeholder={field.placeholder || "Enter value..."}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none pr-10"
        />
        {isSens && (
          <button
            type="button"
            onClick={() => toggleSensitive(field.id)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
          >
            {isShowing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/forms"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 line-clamp-1">{schema.application_name}</h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  formRecord.status === "completed"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {formRecord.status === "completed" ? "Ready" : "Draft"}
              </span>
            </div>
            <a
              href={schema.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-lg"
            >
              <span>{schema.source_url}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReviewMode(!isReviewMode)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              isReviewMode
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isReviewMode ? "Edit Form Fields" : "Review Application"}
          </button>

          <button
            type="button"
            onClick={() => handleSaveDraft(false)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </button>

          <button
            type="button"
            onClick={handleDownloadSummary}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            title="Download formatted text summary for official submission"
          >
            <Download className="w-3.5 h-3.5" />
            Download Summary
          </button>
        </div>
      </div>

      {/* Save Notice */}
      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Progress Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
            {stats.completion_percentage}%
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-slate-800">Application Completeness</span>
              <span className="text-slate-500">
                {stats.filled_fields} of {stats.total_fields} fields completed
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${stats.completion_percentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {stats.profile_filled_fields} from Profile
          </span>
          {stats.missing_required_fields > 0 && (
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {stats.missing_required_fields} missing inputs
            </span>
          )}
        </div>
      </div>

      {/* REVIEW MODE VIEW */}
      {isReviewMode ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Application Review Screen</h2>
              <p className="text-xs text-slate-500">
                Review all populated fields before saving or copying to the official authority portal.
              </p>
            </div>
            <button
              onClick={() => setIsReviewMode(false)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              &larr; Return to Form Editor
            </button>
          </div>

          {/* Missing Fields Warning Banner */}
          {reviewBreakdown.missingItems.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Requires Your Input ({reviewBreakdown.missingItems.length} required fields)</span>
              </div>
              <p className="text-[11px] text-amber-800">
                The following required fields could not be populated from your verified profile and need manual input:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {reviewBreakdown.missingItems.map((m, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-amber-200 text-xs text-slate-800">
                    <strong>{m.field.label}</strong> ({m.sectionName})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Populated Fields Summary */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Populated Application Fields ({reviewBreakdown.filledItems.length})
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {reviewBreakdown.filledItems.map((item, idx) => (
                <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{item.field.label}</span>
                      {item.is_from_profile && (
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Verified Profile
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{item.sectionName}</span>
                  </div>

                  <div className="text-xs font-semibold text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    {item.is_sensitive ? "••••••••••••" : Array.isArray(item.value) ? item.value.join(", ") : String(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps Card */}
          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Next Steps for Official Submission
            </h4>
            <p className="text-xs text-blue-800">
              Download your completed application summary, then open the official website:
            </p>
            <a
              href={schema.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-xs shadow-xs mt-2"
            >
              <span>Open Official Application Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        /* DYNAMIC FORM EDITOR VIEW */
        <div className="space-y-6">
          {/* Section Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            {schema.sections.map((sec, sIdx) => {
              const isActive = activeSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{sec.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Section Form Fields */}
          {schema.sections
            .filter((sec) => sec.id === activeSectionId)
            .map((sec) => (
              <div key={sec.id} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{sec.name}</h2>
                  {sec.description && <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {sec.fields.map((field) => {
                    const entry = formData[field.id];
                    const isFromProf = entry?.is_from_profile;
                    const isMissing = field.required && (!entry || entry.value === null || entry.value === "");

                    return (
                      <div
                        key={field.id}
                        className={`p-4 rounded-xl border transition-colors ${
                          field.type === "textarea" ? "sm:col-span-2" : ""
                        } ${
                          isMissing
                            ? "bg-amber-50/20 border-amber-200"
                            : "bg-slate-50/30 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label
                            htmlFor={field.id}
                            className="text-xs font-bold text-slate-800 flex items-center gap-1"
                          >
                            <span>{field.label}</span>
                            {field.required && <span className="text-red-500">*</span>}
                          </label>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isFromProf && (
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Verified Profile
                              </span>
                            )}
                            {isMissing && (
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Needs Input
                              </span>
                            )}
                            {isFromProf && (
                              <button
                                type="button"
                                onClick={() => handleResetField(field)}
                                className="text-slate-400 hover:text-slate-700 p-0.5"
                                title="Reset to profile default"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {renderFieldControl(field)}

                        {field.description && (
                          <p className="text-[11px] text-slate-400 mt-1">{field.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Sticky Bottom Actions Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Fields
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveDraft(false)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Save Draft
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSaveDraft(true);
                  setIsReviewMode(true);
                }}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                Review & Confirm Application &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
