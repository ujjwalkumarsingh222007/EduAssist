"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
  Table,
  List,
} from "lucide-react";
import { MultiDocumentAuditResult, MultiDocumentConflict } from "@/lib/health/consistency-checker";
import { ExpiryAnalysisSummary } from "@/lib/health/expiry-checker";

interface DocumentHealthReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  consistencySummary?: MultiDocumentAuditResult | null;
  expirySummary?: ExpiryAnalysisSummary | null;
}

export default function DocumentHealthReviewModal({
  isOpen,
  onClose,
  consistencySummary,
  expirySummary,
}: DocumentHealthReviewModalProps) {
  const [activeTab, setActiveTab] = useState<"conflicts" | "matrix">("conflicts");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "critical" | "possible">("all");
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const conflicts = consistencySummary?.conflicts || [];
  const matrix = consistencySummary?.matrix;
  const columns = matrix?.columns || [];
  const rows = matrix?.rows || [];

  const filteredConflicts = conflicts.filter((c) => {
    if (filterSeverity === "critical") return c.severity === "important_mismatch";
    if (filterSeverity === "possible") return c.severity === "possible_difference";
    return true;
  });

  function handleMarkResolved(conflictId: string) {
    setResolvedIds((prev) => [...prev, conflictId]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Document Health & Consistency Matrix</h2>
              <p className="text-xs text-slate-500">
                Multi-document cross-verification across {columns.length} verified records.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("conflicts")}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === "conflicts"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Conflict Issues ({conflicts.length})
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === "matrix"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Full Consistency Matrix ({rows.length} fields)
            </button>
          </div>

          {activeTab === "conflicts" && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterSeverity("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  filterSeverity === "all" ? "bg-blue-50 text-blue-700 font-bold border border-blue-200" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterSeverity("critical")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  filterSeverity === "critical" ? "bg-rose-50 text-rose-700 font-bold border border-rose-200" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Critical Mismatches
              </button>
              <button
                onClick={() => setFilterSeverity("possible")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  filterSeverity === "possible" ? "bg-amber-50 text-amber-700 font-bold border border-amber-200" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Minor Variations
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "conflicts" ? (
            filteredConflicts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800">All evaluated fields are consistent!</p>
                <p className="text-xs text-slate-400">
                  No conflicting attributes found across your {columns.length} verified documents.
                </p>
              </div>
            ) : (
              filteredConflicts.map((conflict) => {
                const isResolved = resolvedIds.includes(conflict.id);
                const isCritical = conflict.severity === "important_mismatch";

                return (
                  <div
                    key={conflict.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isResolved
                        ? "bg-slate-50 border-slate-200 opacity-60"
                        : isCritical
                        ? "bg-rose-50/30 border-rose-200 shadow-2xs"
                        : "bg-amber-50/30 border-amber-200 shadow-2xs"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900 text-xs">
                          {conflict.field_label} ({conflict.category.replace(/_/g, " ")})
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isCritical
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {isCritical ? "🔴 Important Mismatch" : "🟡 Possible Difference"}
                      </span>
                    </div>

                    {/* Multi-Document Values Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {conflict.document_values.map((docVal) => (
                        <div
                          key={docVal.document_id}
                          className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs space-y-1"
                        >
                          <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[10px]">
                            <FileText className="w-3 h-3 text-blue-500" />
                            <span className="truncate" title={docVal.document_name}>
                              {docVal.document_name}
                            </span>
                          </div>
                          <p className="font-mono font-bold text-slate-900 text-xs break-words">
                            {docVal.value || "—"}
                          </p>
                          <span className="text-[9px] text-slate-400 block uppercase tracking-wider">
                            {docVal.document_type}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Finding & Recommendation */}
                    <div className="space-y-1.5 text-xs text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-200/60 mb-3">
                      <p>
                        <strong className="text-slate-700">Audit Finding:</strong> {conflict.explanation}
                      </p>
                      <p className="text-slate-800 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Recommended Action:</span> {conflict.recommendation}
                      </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50">
                      {!isResolved ? (
                        <button
                          onClick={() => handleMarkResolved(conflict.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Mark As Reviewed
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Marked as Reviewed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* Multi-Document Consistency Matrix Table */
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-700 sticky left-0 bg-slate-50 min-w-40">Field Name</th>
                      {columns.map((col) => (
                        <th key={col.document_id} className="p-3 font-bold text-slate-700 min-w-36">
                          <div className="truncate" title={col.document_name}>
                            {col.document_name}
                          </div>
                          <span className="text-[9px] font-normal text-slate-400 block uppercase">
                            {col.document_type}
                          </span>
                        </th>
                      ))}
                      <th className="p-3 font-bold text-slate-700 text-center">Consensus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 2} className="p-8 text-center text-slate-400">
                          Upload 2 or more documents to generate the comparison matrix.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.field_key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white shadow-2xs">
                            {row.field_label}
                            <span className="text-[9px] text-slate-400 block font-normal">
                              {row.category.replace(/_/g, " ")}
                            </span>
                          </td>

                          {columns.map((col) => {
                            const cell = row.cells[col.document_id];
                            const isPresent = cell && cell.status !== "not_present";

                            return (
                              <td key={col.document_id} className="p-3">
                                {isPresent ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1 font-mono font-medium text-slate-800 text-[11px] truncate max-w-44">
                                      {cell.status === "match" && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                                      {cell.status === "possible_variation" && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                                      {cell.status === "mismatch" && <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />}
                                      <span title={cell.value}>{cell.value}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="p-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                row.consensus_status === "important_mismatch"
                                  ? "bg-rose-100 text-rose-800"
                                  : row.consensus_status === "possible_difference"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {row.consensus_status === "important_mismatch" ? "🔴 Mismatch" : row.consensus_status === "possible_difference" ? "🟡 Variation" : "🟢 Match"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Multi-document audit verified across {columns.length} documents
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors"
          >
            Close Audit Report
          </button>
        </div>
      </div>
    </div>
  );
}
