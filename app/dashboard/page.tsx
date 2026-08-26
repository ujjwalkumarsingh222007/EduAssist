import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  User,
  Upload,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Shield,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  Award,
} from "lucide-react";
import { StudentDocument, ExtractionStatus, DocumentType } from "@/lib/types/document";
import { ProfileData } from "@/lib/types/profile";
import { DashboardExtensionCard } from "@/components/extension/DashboardExtensionCard";
import { DocumentHealthWidget } from "@/components/health/DocumentHealthWidget";
import { computeDocumentHealth, UserDocumentItem } from "@/lib/health/document-health-service";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // 1. Fetch Student Profile with profile_data JSONB
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, date_of_birth, gender, phone, address, city, state, country, profile_data, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // 2. Fetch User Documents (Recent list + statistics + extracted data for health audit)
  const { data: rawDocuments } = await supabase
    .from("documents")
    .select("id, user_id, file_name, file_path, document_type, extraction_status, extracted_data, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const documents: StudentDocument[] = (rawDocuments as StudentDocument[]) || [];

  // Extract Profile Data
  const pData: ProfileData = profile?.profile_data || {};
  const fullName = profile?.full_name || (user.user_metadata?.name as string | undefined);
  const firstName = fullName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Student";

  // Document Health Computation (strictly user-scoped)
  const dismissedReminders = (pData.document_health?.dismissed_reminders as string[]) || [];
  const healthState = computeDocumentHealth(
    user.id,
    (rawDocuments as UserDocumentItem[]) || [],
    profile,
    dismissedReminders
  );

  // Document Statistics
  const totalDocs = documents.length;
  const analyzedDocs = documents.filter((d) => d.extraction_status === "completed").length;
  const pendingDocs = documents.filter(
    (d) => d.extraction_status === "uploaded" || d.extraction_status === "processing"
  ).length;
  const failedDocs = documents.filter((d) => d.extraction_status === "failed").length;

  // Verified Information Count (from profile_data and standard profile columns)
  const confirmedFieldsMap = pData.confirmed_fields || {};
  const confirmedFieldKeys = Object.keys(confirmedFieldsMap);

  let verifiedInfoCount = confirmedFieldKeys.length;
  if (verifiedInfoCount === 0) {
    // Fallback: count non-empty verified values across profile
    const verifiedValues = [
      profile?.full_name,
      profile?.date_of_birth,
      profile?.gender,
      profile?.phone,
      profile?.address,
      profile?.city,
      profile?.state,
      pData.personal?.pincode,
      pData.family?.father_name,
      pData.family?.mother_name,
      pData.identity?.aadhaar_number,
      pData.identity?.pan_number,
      pData.education?.institution_name,
      pData.education?.degree,
      pData.education?.roll_number,
      pData.education?.percentage || pData.education?.cgpa,
      pData.eligibility?.annual_income,
      pData.eligibility?.category,
    ];
    verifiedInfoCount = verifiedValues.filter(Boolean).length;
  }

  // Calculate Dynamic Profile Completion Percentage & Missing Info
  const importantFields = [
    { key: "full_name", label: "Full Name", value: profile?.full_name, link: "/dashboard/profile" },
    { key: "date_of_birth", label: "Date of Birth", value: profile?.date_of_birth, link: "/dashboard/profile" },
    { key: "gender", label: "Gender", value: profile?.gender, link: "/dashboard/profile" },
    { key: "phone", label: "Phone Number", value: profile?.phone, link: "/dashboard/profile" },
    { key: "address", label: "Address & City", value: profile?.address || profile?.city, link: "/dashboard/profile" },
    { key: "family", label: "Father / Parent Name", value: pData.family?.father_name || pData.family?.mother_name, link: "/dashboard/profile" },
    { key: "identity", label: "Identity (Aadhaar / PAN)", value: pData.identity?.aadhaar_number || pData.identity?.pan_number, link: "/dashboard/documents" },
    { key: "institution", label: "School / College Name", value: pData.education?.institution_name || pData.education?.university_name, link: "/dashboard/documents" },
    { key: "degree", label: "Degree / Class", value: pData.education?.degree || pData.education?.course, link: "/dashboard/documents" },
    { key: "academics", label: "Scores (Percentage / CGPA)", value: pData.education?.percentage || pData.education?.cgpa || (pData.academic_results && pData.academic_results.length > 0), link: "/dashboard/documents" },
  ];

  const completedCount = importantFields.filter((f) => Boolean(f.value)).length;
  const completionPercent = Math.round((completedCount / importantFields.length) * 100);
  const missingFields = importantFields.filter((f) => !f.value).slice(0, 4);

  // Status Badge Helper
  function renderDocStatusBadge(status: ExtractionStatus) {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileCheck className="w-3 h-3" />
            Analyzed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Clock className="w-3 h-3 animate-spin" />
            Analyzing
          </span>
        );
      case "uploaded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending AI
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  }

  function getDocumentTypeLabel(type: DocumentType): string {
    switch (type) {
      case "transcript":
        return "Academic Marksheet";
      case "certificate":
        return "Degree Certificate";
      case "id_card":
        return "Identity Card (Aadhaar/PAN)";
      case "recommendation":
        return "Income / Domicile Certificate";
      case "test_score":
        return "Test Scorecard";
      default:
        return "Document";
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Here is your digital student profile summary and document analysis status.
        </p>
      </div>

      {/* Dynamic Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Completion */}
        <Link
          href="/dashboard/profile"
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Profile Strength
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-extrabold text-slate-900">{completionPercent}%</p>
              <span className="text-xs font-medium text-slate-400">
                {completedCount}/{importantFields.length} fields
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </Link>

        {/* Total Documents */}
        <Link
          href="/dashboard/documents"
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Documents
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900">{totalDocs}</p>
            <p className="text-xs text-slate-500 mt-1">Total uploaded documents</p>
          </div>
        </Link>

        {/* AI Analyzed Documents */}
        <Link
          href="/dashboard/documents"
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              AI Analyzed
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-slate-900">{analyzedDocs}</p>
              {pendingDocs > 0 && (
                <span className="text-xs font-medium text-amber-600">({pendingDocs} pending)</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {failedDocs > 0 ? `${failedDocs} failed extraction` : "Extracted successfully"}
            </p>
          </div>
        </Link>

        {/* Verified Fields Count */}
        <Link
          href="/dashboard/profile"
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verified Data
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900">{verifiedInfoCount}</p>
            <p className="text-xs text-slate-500 mt-1">Confirmed profile attributes</p>
          </div>
        </Link>
      </div>

      {/* Main Workflow Hero Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Automated Profile Sync
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">Upload Documents to Build Your Profile</h2>
          <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
            Upload marksheets, Aadhaar, PAN, or income certificates. AI extracts the information and lets you review before saving to your verified profile.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/dashboard/documents"
            className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-xs sm:text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-xs sm:text-sm"
          >
            <User className="w-4 h-4" />
            View Profile
          </Link>
        </div>
      </div>

      {/* Document Health & Consistency Audit Widget */}
      <DocumentHealthWidget initialHealth={healthState} userId={user.id} />

      {/* Chrome Extension Companion Card */}
      <DashboardExtensionCard userId={user.id} />

      {/* Two Column Layout: Missing Info & Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Missing Profile Fields Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-sm">Complete Your Profile</h2>
              <span className="text-xs font-semibold text-blue-600">{completionPercent}%</span>
            </div>

            {missingFields.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-900 text-sm">All core details complete!</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your master profile has all key personal, academic, and contact fields.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-500 mb-3">
                  Add or extract these fields to strengthen your profile:
                </p>
                {missingFields.map((field) => (
                  <Link
                    key={field.key}
                    href={field.link}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-200 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-700">
                        {field.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-0.5 shrink-0">
                      Add <ChevronRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/dashboard/profile"
            className="mt-5 inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            Manage Digital Profile
          </Link>
        </div>

        {/* Right Column: Recent Documents List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-sm">
                Recent Documents ({documents.length})
              </h2>
              <Link
                href="/dashboard/documents"
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {documents.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No documents uploaded yet</p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                  Upload your marksheets, income certificate, or IDs to start automated data extraction.
                </p>
                <Link
                  href="/dashboard/documents"
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Upload First Document
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {getDocumentTypeLabel(doc.document_type)} •{" "}
                          {new Date(doc.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {renderDocStatusBadge(doc.extraction_status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {analyzedDocs} of {totalDocs} documents analyzed with AI
            </span>
            <Link
              href="/dashboard/documents"
              className="font-semibold text-blue-600 hover:underline"
            >
              Manage Documents &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="font-bold text-slate-900 text-sm mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/documents"
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-xs transition-all group"
          >
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">Upload Student Document</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload Marksheet, Certificate, or ID for AI analysis
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
          </Link>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-xs transition-all group"
          >
            <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">View & Edit Master Profile</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Review verified details across personal, family, and education
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
