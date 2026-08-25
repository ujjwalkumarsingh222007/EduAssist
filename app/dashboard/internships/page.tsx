"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
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
  MapPin,
  Clock,
  ShieldCheck,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Code2,
} from "lucide-react";
import {
  OpportunityEvaluationResult,
  OpportunityDiscoveryResult,
  EligibilityStatus,
} from "@/lib/opportunities/types";

export default function InternshipsDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | EligibilityStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<OpportunityDiscoveryResult | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchInternships(searchQuery);
  }, []);

  async function fetchInternships(query: string = "") {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/api/opportunities/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "internship", query }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to discover internships");
      }

      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.error("Internships load error:", err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  function toggleCard(id: string) {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Internships & Research Training</h1>
              <p className="text-xs text-slate-500">
                Technical internships with skill match meters, stipends, and automatic eligibility evaluation
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchInternships(searchQuery)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Refresh Internships
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* KPI Cards */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setStatusFilter("ALL")}
            className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
              statusFilter === "ALL" ? "border-blue-500 shadow-xs" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-slate-500 font-medium">All Internships</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{result.internships_count}</p>
          </div>

          <div
            onClick={() => setStatusFilter("ELIGIBLE")}
            className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
              statusFilter === "ELIGIBLE" ? "border-emerald-500 shadow-xs" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-emerald-700 font-medium">Eligible</span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{result.eligible_count}</p>
          </div>

          <div
            onClick={() => setStatusFilter("PARTIALLY_ELIGIBLE")}
            className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
              statusFilter === "PARTIALLY_ELIGIBLE" ? "border-amber-500 shadow-xs" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-amber-700 font-medium">Review Required</span>
            <p className="text-2xl font-bold text-amber-700 mt-1">{result.review_required_count}</p>
          </div>

          <div
            onClick={() => setStatusFilter("INELIGIBLE")}
            className={`p-4 bg-white border rounded-xl cursor-pointer transition-all ${
              statusFilter === "INELIGIBLE" ? "border-red-500 shadow-xs" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-red-700 font-medium">Not Eligible</span>
            <p className="text-2xl font-bold text-red-700 mt-1">{result.ineligible_count}</p>
          </div>
        </div>
      )}

      {/* Internships List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Evaluating Technical Skills & Branch Eligibility...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No internships found for current filter</h3>
          </div>
        ) : (
          filteredMatches.map((m) => {
            const opp = m.opportunity;
            const isExpanded = Boolean(expandedCards[opp.id]);

            return (
              <div
                key={opp.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-50 text-purple-700 border border-purple-200">
                        {opp.organization}
                      </span>
                      {opp.remote && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          🌐 Remote Friendly
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{opp.title}</h2>
                  </div>

                  <div className="flex items-center gap-3 self-start">
                    {getStatusBadge(m.status)}
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-600">{m.overall_match_score}% Match</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${m.overall_match_score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{opp.description}</p>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  {opp.stipend && (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      💰 {opp.stipend}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {opp.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Deadline: {opp.deadline}
                  </span>
                  {opp.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {opp.duration}
                    </span>
                  )}
                </div>

                {/* Skill Match Breakdown */}
                {opp.required_skills && opp.required_skills.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 block">Required Skills Match ({m.skill_match_score}%):</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {opp.required_skills.map((s) => {
                          const isMatched = m.matched_skills.includes(s);
                          return (
                            <span
                              key={s}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isMatched
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-white text-slate-600 border-slate-200"
                              }`}
                            >
                              {isMatched ? "✓ " : "✕ "}
                              {s}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {opp.preferred_skills && opp.preferred_skills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-purple-800 block">Preferred Skills:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {opp.preferred_skills.map((ps) => (
                            <span key={ps} className="text-[10px] font-medium px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                              {ps}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => toggleCard(opp.id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {isExpanded ? "Hide Criteria Breakdown" : "View Criteria Breakdown"}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <a
                    href={opp.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                  >
                    Apply on Official Portal
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Expanded Criteria Breakdown */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs mt-3 animate-fadeIn">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Why Eligible / Ineligible Breakdown
                    </h4>
                    {m.criteria_results.map((c, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            {c.result === "PASS" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-red-600" />
                            )}
                            {c.requirement_label}
                          </span>
                          <p className="text-[11px] text-slate-500">{c.reason}</p>
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 font-medium">
                          {c.source_display}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
