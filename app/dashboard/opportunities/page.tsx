"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Award,
  Briefcase,
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
  MapPin,
  Clock,
  ShieldCheck,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight,
  Filter,
  Zap,
  Lock,
} from "lucide-react";
import {
  Opportunity,
  OpportunityEvaluationResult,
  OpportunityDiscoveryResult,
  OpportunityType,
  EligibilityStatus,
} from "@/lib/opportunities/types";

export default function OpportunitiesDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<OpportunityType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EligibilityStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<OpportunityDiscoveryResult | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [selectedOppForModal, setSelectedOppForModal] = useState<OpportunityEvaluationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchOpportunities(activeTab, searchQuery);
  }, [activeTab]);

  async function fetchOpportunities(type: OpportunityType | "all", query: string = "") {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/api/opportunities/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, query }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to discover opportunities");
      }

      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.error("Opportunity load error:", err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchOpportunities(activeTab, searchQuery);
  }

  function toggleCard(id: string) {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Filtered list
  const filteredMatches = (result?.matches || []).filter((m) => {
    if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: EligibilityStatus) => {
    switch (status) {
      case "ELIGIBLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Eligible
          </span>
        );
      case "PARTIALLY_ELIGIBLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Review Required
          </span>
        );
      case "INSUFFICIENT_INFORMATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
            Info Missing
          </span>
        );
      case "INELIGIBLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-full">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Not Eligible
          </span>
        );
    }
  };

  const getDeadlineText = (deadlineStr: string) => {
    if (!deadlineStr) return "Open";
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Closed";
    if (diffDays === 0) return "Closing Today";
    if (diffDays === 1) return "Closing Tomorrow";
    if (diffDays <= 7) return `${diffDays} days left`;
    return `Deadline: ${deadlineStr}`;
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Opportunities Hub</h1>
              <p className="text-xs text-slate-500">
                AI-assisted eligibility matching for Scholarships, Internships, and Fellowships
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchOpportunities(activeTab, searchQuery)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning Opportunities...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Refresh Discovery
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Tabs (All, Scholarships, Internships) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            All Opportunities
            {result?.total_found ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
                {result.total_found}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("scholarship")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "scholarship"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Scholarships
            {result?.scholarships_count ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
                {result.scholarships_count}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("internship")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "internship"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Internships
            {result?.internships_count ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
                {result.internships_count}
              </span>
            ) : null}
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, skills..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Summary KPI Cards */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setStatusFilter("ALL")}
            className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
              statusFilter === "ALL" ? "border-blue-500 shadow-xs" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Total Found</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{result.total_found}</p>
          </div>

          <div
            onClick={() => setStatusFilter("ELIGIBLE")}
            className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
              statusFilter === "ELIGIBLE" ? "border-emerald-500 shadow-xs" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-medium">Eligible</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{result.eligible_count}</p>
          </div>

          <div
            onClick={() => setStatusFilter("PARTIALLY_ELIGIBLE")}
            className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
              statusFilter === "PARTIALLY_ELIGIBLE" ? "border-amber-500 shadow-xs" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-700 font-medium">Review Required</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1">{result.review_required_count}</p>
          </div>

          <div
            onClick={() => setStatusFilter("INELIGIBLE")}
            className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
              statusFilter === "INELIGIBLE" ? "border-red-500 shadow-xs" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-700 font-medium">Not Eligible</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{result.ineligible_count}</p>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Analyzing Opportunities & Evaluating Eligibility...</p>
            <p className="text-xs text-slate-500">Checking verified 10th/12th/UG marks, categories, and technical skills.</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No opportunities match current filter</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting filters or searching with different keywords.</p>
          </div>
        ) : (
          filteredMatches.map((m) => {
            const opp = m.opportunity;
            const isExpanded = Boolean(expandedCards[opp.id]);
            const isScholarship = opp.type === "scholarship";

            return (
              <div
                key={opp.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600">
                        {opp.type}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">{opp.organization}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{opp.title}</h2>
                  </div>

                  <div className="flex items-center gap-3 self-start">
                    {getStatusBadge(m.status)}
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-600">{m.overall_match_score}% Match</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            m.status === "ELIGIBLE"
                              ? "bg-emerald-500"
                              : m.status === "PARTIALLY_ELIGIBLE"
                              ? "bg-amber-500"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${m.overall_match_score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{opp.description}</p>

                {/* Key Opportunity Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                  {opp.stipend ? (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      💰 {opp.stipend}
                    </span>
                  ) : opp.amount ? (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      💰 {opp.amount}
                    </span>
                  ) : null}

                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {opp.remote ? "Remote" : opp.location}
                  </span>

                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {getDeadlineText(opp.deadline)}
                  </span>

                  {opp.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {opp.duration}
                    </span>
                  )}
                </div>

                {/* Required Skills (If Internship) */}
                {opp.required_skills && opp.required_skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">Skills:</span>
                    {opp.required_skills.map((s) => {
                      const isMatched = m.matched_skills.includes(s);
                      return (
                        <span
                          key={s}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isMatched
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isMatched ? "✓ " : ""}
                          {s}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => toggleCard(opp.id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {isExpanded ? "Hide Criteria Breakdown" : "View Criteria Breakdown"}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOppForModal(m)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Check Readiness
                    </button>

                    <a
                      href={opp.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                    >
                      Apply & Autofill
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Expanded Criteria Breakdown */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 mt-3 animate-fadeIn">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Why Eligible / Ineligible Matrix
                    </h4>
                    <div className="space-y-2">
                      {m.criteria_results.map((c, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                              {c.result === "PASS" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : c.result === "FAIL" ? (
                                <X className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              )}
                              <span>{c.requirement_label}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Required: <span className="text-slate-700">{c.required_value_display}</span> | Your Profile:{" "}
                              <span className="font-semibold text-slate-800">{c.student_value_display}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 italic">{c.reason}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {c.source_display}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recommended Actions */}
                    {m.recommended_actions.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[11px] font-bold text-amber-800 block mb-1">Recommended Next Steps:</span>
                        <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                          {m.recommended_actions.map((act, idx) => (
                            <li key={idx}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Application Readiness Modal */}
      {selectedOppForModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Application Readiness</h3>
                  <p className="text-[11px] text-slate-500">{selectedOppForModal.opportunity.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOppForModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Checklist */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-700">1. Verified Profile</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-700">2. Required Documents</span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    selectedOppForModal.application_readiness.required_documents_available
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {selectedOppForModal.application_readiness.required_documents_available ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> All Available
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Missing (
                      {selectedOppForModal.application_readiness.missing_documents.length})
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-700">3. Eligibility Status</span>
                <span>{getStatusBadge(selectedOppForModal.status)}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-700">4. Form Autofill</span>
                <span className="text-blue-700 font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Chrome Extension Ready
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-700">5. Security (CAPTCHA / OTP)</span>
                <span className="text-amber-800 font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Manual Action
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedOppForModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
              <a
                href={selectedOppForModal.opportunity.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                Open Application Portal
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
