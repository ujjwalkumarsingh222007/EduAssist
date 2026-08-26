"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  ChevronRight,
  Sparkles,
  Bell,
  X,
  FileText,
  Table,
  GraduationCap,
  Award,
} from "lucide-react";
import DocumentHealthReviewModal from "./DocumentHealthReviewModal";
import { DocumentHealthState } from "@/lib/health/document-health-service";

interface DocumentHealthWidgetProps {
  initialHealth?: DocumentHealthState | null;
  userId: string;
}

export function DocumentHealthWidget({ initialHealth, userId }: DocumentHealthWidgetProps) {
  const [health, setHealth] = useState<DocumentHealthState | null>(initialHealth || null);
  const [rechecking, setRechecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>(
    initialHealth?.dismissed_reminders || []
  );

  async function handleRecheck() {
    try {
      setRechecking(true);
      const res = await fetch("/api/health/recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.health) {
        setHealth(data.health);
      }
    } catch (err) {
      console.error("Recheck error:", err);
    } finally {
      setRechecking(false);
    }
  }

  function handleDismissReminder(reminderId: string) {
    setDismissedReminders((prev) => [...prev, reminderId]);
  }

  if (!health) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Document Health</h3>
            <p className="text-xs text-slate-500">Multi-document consistency and validity audit across all verified records.</p>
          </div>
        </div>
        <button
          onClick={handleRecheck}
          disabled={rechecking}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? "animate-spin" : ""}`} />
          Run Health Audit
        </button>
      </div>
    );
  }

  const { consistency, expiry, overall_status } = health;
  const conflicts = consistency.conflicts || [];
  const matrix = consistency.matrix;
  const columns = matrix?.columns || [];
  const rows = matrix?.rows || [];

  const criticalCount = conflicts.filter((c) => c.severity === "important_mismatch").length;
  const possibleCount = conflicts.filter((c) => c.severity === "possible_difference").length;

  const identityStats = consistency.identity_consistency || { total_fields: 0, consistent_fields: 0 };
  const academicStats = consistency.academic_consistency || { total_fields: 0, consistent_fields: 0 };

  // Active reminders
  const activeReminders = (expiry.reports || []).filter(
    (r) => r.reminder_needed && !dismissedReminders.includes(r.document_id)
  );

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
        {/* Widget Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                overall_status === "has_critical_mismatches"
                  ? "bg-rose-100 text-rose-700"
                  : overall_status === "needs_attention"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Document Health</h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    overall_status === "has_critical_mismatches"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : overall_status === "needs_attention"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {overall_status === "has_critical_mismatches"
                    ? `🔴 ${criticalCount} Critical Mismatch${criticalCount > 1 ? "es" : ""}`
                    : overall_status === "needs_attention"
                    ? `🟡 ${possibleCount} Issue${possibleCount > 1 ? "s" : ""} Need Attention`
                    : "🟢 All Documents Consistent"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing {columns.length} verified documents across identity, academic, and certificate records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRecheck}
              disabled={rechecking}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3 h-3 text-slate-500 ${rechecking ? "animate-spin" : ""}`} />
              Recheck Documents
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
            >
              <span>Review Matrix</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reminders Alert Banner */}
        {activeReminders.length > 0 && (
          <div className="p-3 bg-amber-50/80 border-b border-amber-200 space-y-2">
            {activeReminders.map((rem) => (
              <div key={rem.document_id} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-medium">
                  <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>{rem.document_name}</strong>: {rem.status_label} ({rem.recommendation})
                  </span>
                </div>
                <button
                  onClick={() => handleDismissReminder(rem.document_id)}
                  className="p-1 text-amber-700 hover:text-amber-900 rounded-md hover:bg-amber-200/50 transition-colors"
                  title="Dismiss reminder"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Three Pillar Summary Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100">
          {/* 1. Identity Consistency */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Identity Consistency
              </span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-slate-900">
              {identityStats.total_fields > 0
                ? `${identityStats.consistent_fields}/${identityStats.total_fields} Fields Consistent`
                : "No Overlapping Fields"}
            </p>
            <p className="text-[11px] text-slate-500">
              {identityStats.consistent_fields === identityStats.total_fields
                ? "Name, DOB, and parents match across documents."
                : "Variations detected in identity records."}
            </p>
          </div>

          {/* 2. Academic Consistency */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Academic Consistency
              </span>
              <GraduationCap className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-sm font-bold text-slate-900">
              {academicStats.consistent_fields === academicStats.total_fields
                ? "No Unexpected Conflicts"
                : `${academicStats.consistent_fields}/${academicStats.total_fields} Consistent`}
            </p>
            <p className="text-[11px] text-slate-500">
              Class 10 vs 12 examination scores separated cleanly.
            </p>
          </div>

          {/* 3. Certificate & Expiry Status */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Certificate Status
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-slate-900">
              {expiry.expiring_soon_count > 0
                ? `${expiry.expiring_soon_count} Expiring Soon`
                : expiry.expired_count > 0
                ? `${expiry.expired_count} Expired`
                : `${expiry.active_count} Active & Valid`}
            </p>
            <p className="text-[11px] text-slate-500">
              {expiry.reports.length} certificate validity records monitored.
            </p>
          </div>
        </div>

        {/* Conflicts and Matrix Preview */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Column 1: Active Inconsistencies List */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Detected Discrepancies ({conflicts.length})
              </span>
              {conflicts.length > 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-blue-600 hover:underline text-[10px] font-bold"
                >
                  View All &rarr;
                </button>
              )}
            </h4>

            {conflicts.length === 0 ? (
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-800">All overlapping information is consistent</p>
                <p className="text-[11px] text-slate-500">
                  Your verified documents share matching names, dates of birth, and identity records.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {conflicts.slice(0, 3).map((conflict) => (
                  <div
                    key={conflict.id}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      conflict.severity === "important_mismatch"
                        ? "bg-rose-50/40 border-rose-200"
                        : "bg-amber-50/40 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">
                          {conflict.severity === "important_mismatch" ? "🔴" : "🟡"}
                        </span>
                        <strong className="text-slate-900">{conflict.field_label} differs</strong>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {conflict.documents_affected} docs
                      </span>
                    </div>

                    <div className="space-y-1">
                      {conflict.document_values.map((dv) => (
                        <div
                          key={dv.document_id}
                          className="flex items-center justify-between text-[11px] bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200"
                        >
                          <span className="text-slate-500 truncate max-w-40 font-medium">
                            {dv.document_name}
                          </span>
                          <span className="font-mono font-bold text-slate-900">{dv.value}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-600 pt-1">
                      <Sparkles className="w-3 h-3 text-blue-600 inline mr-1" />
                      {conflict.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Document Validity & Expiry */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              Document Expiry & Validity Status
            </h4>

            {expiry.reports.length === 0 ? (
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                <p className="font-bold text-slate-700">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expiry.reports.map((rep) => (
                  <div
                    key={rep.document_id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate" title={rep.document_name}>
                          {rep.document_name}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {rep.document_type}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        rep.badge_color === "red"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : rep.badge_color === "yellow"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : rep.badge_color === "green"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {rep.status_label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Review Modal */}
      <DocumentHealthReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        consistencySummary={consistency}
        expirySummary={expiry}
      />
    </>
  );
}
