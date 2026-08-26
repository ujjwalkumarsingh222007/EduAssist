"use client";

import React from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  GraduationCap,
  Briefcase,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Tag,
  AlertCircle,
} from "lucide-react";
import { ActionTask, ActionCenterSummary, SmartSuggestion } from "@/lib/action-center/types";
import Link from "next/link";

interface TodayDashboardProps {
  summary: ActionCenterSummary;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  onOpenCreateTask: (initialData?: Partial<ActionTask>) => void;
  onAddSuggestion: (sug: SmartSuggestion) => Promise<void>;
}

export default function TodayDashboard({
  summary,
  onToggleTask,
  onOpenCreateTask,
  onAddSuggestion,
}: TodayDashboardProps) {
  const { today_date, today_tasks, overdue_tasks, document_alerts, upcoming_deadlines, smart_suggestions } = summary;

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Welcome & Summary Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Today's Academic Planner</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
            {today_tasks.length > 0
              ? `You have ${today_tasks.length} planned activity${today_tasks.length > 1 ? "ies" : ""} scheduled for today.`
              : "No tasks scheduled for today. Plan your study session or check deadlines below."}
          </p>
        </div>

        <button
          onClick={() => onOpenCreateTask({ due_date: today_date })}
          className="px-4 py-2.5 bg-white text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-50 transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          + Add Task / Activity
        </button>
      </div>

      {/* Overdue Tasks Alert (if any) */}
      {overdue_tasks.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>⚠ Overdue Tasks ({overdue_tasks.length})</span>
          </div>
          <div className="space-y-2">
            {overdue_tasks.map((ot) => (
              <div
                key={ot.id}
                className="p-3 bg-white rounded-xl border border-rose-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={ot.completed}
                    onChange={(e) => onToggleTask(ot.id, e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{ot.title}</p>
                    <p className="text-[11px] text-rose-600">Was due on {ot.due_date}</p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenCreateTask(ot)}
                  className="text-[11px] text-blue-600 hover:underline font-semibold shrink-0"
                >
                  Reschedule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Today's Tasks vs Alerts & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Schedule & Planned Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">📌 Today's Schedule & Tasks</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {today_tasks.filter((t) => t.completed).length}/{today_tasks.length} Completed
              </span>
            </div>

            {today_tasks.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No tasks on today's agenda</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Add study blocks, assignment due dates, or application steps to plan your day.
                </p>
                <button
                  onClick={() => onOpenCreateTask({ due_date: today_date })}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Activity
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {today_tasks.map((task) => {
                  const isHigh = task.priority === "high";
                  const isMed = task.priority === "medium";

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        task.completed
                          ? "bg-slate-50 border-slate-200 opacity-60"
                          : isHigh
                          ? "bg-rose-50/30 border-rose-200 shadow-2xs"
                          : isMed
                          ? "bg-amber-50/30 border-amber-200 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => onToggleTask(task.id, e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-xs font-bold truncate ${
                                task.completed ? "line-through text-slate-500" : "text-slate-900"
                              }`}
                            >
                              {task.title}
                            </p>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                                isHigh
                                  ? "bg-rose-100 text-rose-800"
                                  : isMed
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            {task.all_day ? (
                              <span className="font-semibold text-purple-600">All Day</span>
                            ) : task.start_time ? (
                              <span className="font-mono text-slate-600">
                                {task.start_time} {task.end_time ? `– ${task.end_time}` : ""}
                              </span>
                            ) : null}
                            <span className="text-slate-300">•</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                              {task.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenCreateTask(task)}
                        className="text-[11px] text-slate-400 hover:text-blue-600 font-semibold px-2 py-1"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart Suggestions */}
          {smart_suggestions.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-blue-50 rounded-2xl border border-amber-200/80 p-5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Smart Action Suggestions</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {smart_suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{sug.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{sug.description}</p>
                    </div>
                    <button
                      onClick={() => onAddSuggestion(sug)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 self-start pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      {sug.action_label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Document Alerts & Upcoming Deadlines */}
        <div className="space-y-6">
          {/* Document Expiry Alerts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Document Expiry Alerts
                </h3>
              </div>
              <Link href="/dashboard/documents" className="text-[11px] text-blue-600 hover:underline font-semibold">
                Vault &rarr;
              </Link>
            </div>

            {document_alerts.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="font-bold text-slate-800">All certificates active</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No documents expiring in the next 30 days.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {document_alerts.map((doc) => (
                  <div
                    key={doc.document_id}
                    className={`p-3 rounded-xl border space-y-2 ${
                      doc.status === "EXPIRED"
                        ? "bg-rose-50/50 border-rose-200 text-rose-900"
                        : "bg-amber-50/50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <strong className="truncate max-w-36">{doc.document_name}</strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border">
                        {doc.status_label}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        onOpenCreateTask({
                          title: `Renew ${doc.document_name}`,
                          category: "Document",
                          priority: "high",
                          due_date: today_date,
                          source_type: "DOCUMENT_EXPIRY",
                          source_id: doc.document_id,
                        })
                      }
                      className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Create Renewal Task
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Upcoming Deadlines
                </h3>
              </div>
              <Link href="/dashboard/scholarships" className="text-[11px] text-blue-600 hover:underline font-semibold">
                Explore &rarr;
              </Link>
            </div>

            <div className="space-y-2.5">
              {upcoming_deadlines.slice(0, 4).map((opp) => (
                <div
                  key={opp.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate" title={opp.title}>
                        {opp.title}
                      </p>
                      <p className="text-[11px] text-slate-500">{opp.provider}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        opp.is_urgent ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {opp.days_remaining}d left
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="font-semibold text-emerald-700">{opp.amount_or_stipend}</span>
                    <button
                      onClick={() =>
                        onOpenCreateTask({
                          title: `Apply for ${opp.title}`,
                          category: opp.type === "SCHOLARSHIP" ? "Scholarship" : "Internship",
                          priority: opp.is_urgent ? "high" : "medium",
                          due_date: opp.deadline,
                          source_type: opp.type === "SCHOLARSHIP" ? "SCHOLARSHIP" : "INTERNSHIP",
                          source_id: opp.id,
                          source_title: opp.title,
                        })
                      }
                      className="font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      Add Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
