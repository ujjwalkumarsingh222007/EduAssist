"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Loader2,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Globe,
  Database,
  ArrowRight,
  User,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { EligibilityMatch, EligibilityStatus, ScholarshipDiscoveryResult, Scholarship } from "@/lib/scholarships/types";
import { AutoFillSession } from "@/lib/forms/types";
import AutoFillModal from "@/components/forms/AutoFillModal";

export default function ScholarshipsPage() {
  const [loading, setLoading] = useState(false);
  const [searchStep, setSearchStep] = useState<string>("");
  const [result, setResult] = useState<ScholarshipDiscoveryResult | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | EligibilityStatus>("all");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [autofillSession, setAutofillSession] = useState<AutoFillSession | null>(null);
  const [autofillingId, setAutofillingId] = useState<string | null>(null);

  async function handleLaunchAutoFill(s: Scholarship) {
    try {
      setAutofillingId(s.id);
      const res = await fetch("/api/forms/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scholarship_id: s.id,
          scholarship_title: s.title,
          provider: s.provider,
          official_url: s.application_url,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.session) {
        setAutofillSession(data.session);
      } else {
        alert(data.error || "Could not generate form auto-fill session.");
      }
    } catch (err) {
      console.error("Autofill error:", err);
      alert("Failed to start assisted auto-fill.");
    } finally {
      setAutofillingId(null);
    }
  }

  async function handleDiscoverScholarships() {
    try {
      setLoading(true);
      setErrorMessage("");
      setSearchStep("Connecting to Supabase scholarship database...");

      const timer1 = setTimeout(() => {
        setSearchStep("Discovering live opportunities from official web portals...");
      }, 700);

      const timer2 = setTimeout(() => {
        setSearchStep("Deduplicating & evaluating eligibility against verified profile...");
      }, 1400);

      const res = await fetch("/api/scholarships/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to discover scholarships");
      }

      setResult(data);
      // Auto expand all eligible cards
      const autoExpanded: Record<string, boolean> = {};
      data.matches?.forEach((m: EligibilityMatch) => {
        if (m.status === "eligible" || m.status === "potentially_eligible") {
          autoExpanded[m.scholarship.id] = true;
        }
      });
      setExpandedCards(autoExpanded);
    } catch (err: unknown) {
      console.error("Discovery error:", err);
      setErrorMessage(err instanceof Error ? err.message : "An error occurred while finding scholarships.");
    } finally {
      setLoading(false);
      setSearchStep("");
    }
  }

  function toggleExpand(id: string) {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const filteredMatches = result?.matches?.filter((m) => {
    if (selectedFilter === "all") return true;
    return m.status === selectedFilter;
  }) || [];

  function renderStatusBadge(status: EligibilityStatus) {
    switch (status) {
      case "eligible":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Eligible
          </span>
        );
      case "potentially_eligible":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5" />
            Potentially Eligible
          </span>
        );
      case "not_eligible":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5" />
            Not Eligible
          </span>
        );
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header & Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Scholarship Discovery
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Hybrid Search
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Search our scholarship database and the live web to find scholarships tailored to your verified profile.
          </p>
        </div>

        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs shrink-0"
        >
          <User className="w-3.5 h-3.5 text-blue-600" />
          View Verified Profile
        </Link>
      </div>

      {/* Discovery CTA Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Automated Eligibility Matching
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">Find Scholarships Matched to You</h2>
          <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
            We evaluate your confirmed marks, course, state domicile, and annual income against official government and foundation criteria.
          </p>
        </div>

        <button
          onClick={handleDiscoverScholarships}
          disabled={loading}
          className="shrink-0 flex items-center gap-2 bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 disabled:opacity-75 disabled:cursor-not-allowed transition-all text-sm shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching Opportunities...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 text-blue-600" />
              Find Scholarships For Me
            </>
          )}
        </button>
      </div>

      {/* Live Search Step Indicator */}
      {loading && (
        <div className="bg-white rounded-2xl border border-blue-200 p-8 text-center shadow-xs animate-in fade-in">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-800">{searchStep}</p>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing official databases, UGC, AICTE, NSP, and verified public feeds...
          </p>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3.5 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Notice</p>
            <p className="text-red-700 text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Initial Empty State Before Search */}
      {!loading && !result && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-7 h-7" />
          </div>
          <h2 className="font-bold text-slate-900 mb-1.5">No Scholarships Searched Yet</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Click &quot;Find Scholarships For Me&quot; above to search both our verified database and current public internet scholarship announcements.
          </p>
          <button
            onClick={handleDiscoverScholarships}
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-xs"
          >
            <Search className="w-4 h-4" />
            Start Discovery Search
          </button>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary & Filter Tabs Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({result.total_found})
              </button>

              <button
                onClick={() => setSelectedFilter("eligible")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedFilter === "eligible"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                🟢 Eligible ({result.eligible_count})
              </button>

              <button
                onClick={() => setSelectedFilter("potentially_eligible")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedFilter === "potentially_eligible"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                🟡 Potentially Eligible ({result.potentially_eligible_count})
              </button>

              <button
                onClick={() => setSelectedFilter("not_eligible")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedFilter === "not_eligible"
                    ? "bg-slate-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                🔴 Not Eligible ({result.not_eligible_count})
              </button>
            </div>

            {/* Source Origin Breakdown */}
            <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-purple-600" />
                {result.database_count} Database
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                {result.web_count} Web Discovered
              </span>
            </div>
          </div>

          {/* Matches List */}
          {filteredMatches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No scholarships match the selected filter.
              </p>
              <button
                onClick={() => setSelectedFilter("all")}
                className="text-xs text-blue-600 font-semibold hover:underline mt-2 inline-block"
              >
                View all scholarships
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match) => {
                const s = match.scholarship;
                const isExpanded = Boolean(expandedCards[s.id]);

                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                      match.status === "eligible"
                        ? "border-emerald-200 hover:border-emerald-300"
                        : match.status === "potentially_eligible"
                        ? "border-amber-200 hover:border-amber-300"
                        : "border-slate-200 opacity-80"
                    }`}
                  >
                    {/* Card Header & Summary */}
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {renderStatusBadge(match.status)}
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {s.source_type === "database" ? (
                                <>
                                  <Database className="w-3 h-3 text-purple-600" /> Database Verified
                                </>
                              ) : (
                                <>
                                  <Globe className="w-3 h-3 text-blue-600" /> Web Discovered
                                </>
                              )}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            Provider: <span className="text-slate-800">{s.provider}</span>
                          </p>
                        </div>

                        {/* Amount Callout */}
                        <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-left sm:text-right shrink-0">
                          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                            Benefit
                          </p>
                          <p className="text-sm font-extrabold text-blue-600">{s.amount}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 mb-4">{s.description}</p>

                      {/* Key Meta Badges */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Deadline: <strong className="text-slate-700">{s.deadline}</strong></span>
                        </div>

                        <span>•</span>

                        <div className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-xs" title={s.source_name}>
                            Source: <strong className="text-slate-700">{s.source_name}</strong>
                          </span>
                        </div>

                        <button
                          onClick={() => toggleExpand(s.id)}
                          className="ml-auto text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          {isExpanded ? "Hide Analysis" : "Why am I matched?"}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Detailed Eligibility Analysis */}
                    {isExpanded && (
                      <div className="bg-slate-50/80 border-t border-slate-100 p-5 sm:p-6 space-y-4 animate-in fade-in">
                        {/* Summary Reason */}
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
                          <p className="font-bold text-slate-800 mb-0.5">Eligibility Evaluation:</p>
                          <p className="text-slate-600">{match.reason}</p>
                        </div>

                        {/* Matched Requirements */}
                        {match.matched_requirements.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Matched Criteria ({match.matched_requirements.length})
                            </p>
                            <ul className="space-y-1.5 pl-2">
                              {match.matched_requirements.map((req, rIdx) => (
                                <li key={rIdx} className="text-xs text-slate-700 flex items-start gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Missing Requirements (Potentially Eligible) */}
                        {match.missing_requirements.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              Missing Verification in Profile ({match.missing_requirements.length})
                            </p>
                            <ul className="space-y-1.5 pl-2">
                              {match.missing_requirements.map((req, rIdx) => (
                                <li key={rIdx} className="text-xs text-amber-900 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Failed Requirements (Not Eligible) */}
                        {match.failed_requirements.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Unmet Requirements ({match.failed_requirements.length})
                            </p>
                            <ul className="space-y-1.5 pl-2">
                              {match.failed_requirements.map((req, rIdx) => (
                                <li key={rIdx} className="text-xs text-rose-900 flex items-start gap-2">
                                  <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Required Documents Checklist */}
                        {match.document_matches.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              Required Documents Checklist
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {match.document_matches.map((doc, dIdx) => (
                                <div
                                  key={dIdx}
                                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                    doc.is_available
                                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                                      : "bg-slate-100 border-slate-200 text-slate-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {doc.is_available ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    )}
                                    <span className="font-medium truncate">{doc.document_name}</span>
                                  </div>
                                  <span className="text-[10px] font-semibold shrink-0">
                                    {doc.is_available ? "Uploaded" : "Pending Upload"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Official Action Button */}
                        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <p className="text-[11px] text-slate-500">
                            Review verified values or open the official portal. Antigravity never auto-submits applications.
                          </p>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleLaunchAutoFill(s)}
                              disabled={autofillingId === s.id}
                              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors text-xs shadow-xs"
                            >
                              {autofillingId === s.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Analyzing Form...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  Auto-Fill Application
                                </>
                              )}
                            </button>

                            <a
                              href={s.application_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors text-xs shadow-2xs"
                            >
                              <span>Official Portal</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Auto-Fill Review Modal */}
      <AutoFillModal
        isOpen={Boolean(autofillSession)}
        session={autofillSession}
        onClose={() => setAutofillSession(null)}
      />
    </div>
  );
}
