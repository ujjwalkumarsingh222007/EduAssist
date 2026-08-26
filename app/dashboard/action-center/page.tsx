"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Calendar,
  CheckSquare,
  FileText,
  GraduationCap,
  CheckCircle2,
  Plus,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { ActionTask, ActionCenterSummary, SmartSuggestion } from "@/lib/action-center/types";
import TodayDashboard from "@/components/action-center/TodayDashboard";
import CalendarView from "@/components/action-center/CalendarView";
import TaskChecklist from "@/components/action-center/TaskChecklist";
import CompletedHistory from "@/components/action-center/CompletedHistory";
import TaskModal from "@/components/action-center/TaskModal";
import Link from "next/link";

type ActionCenterTab =
  | "today"
  | "calendar"
  | "tasks"
  | "documents"
  | "deadlines"
  | "completed";

export default function ActionCenterPage() {
  const [activeTab, setActiveTab] = useState<ActionCenterTab>("today");
  const [summary, setSummary] = useState<ActionCenterSummary | null>(null);
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTask, setModalInitialTask] = useState<Partial<ActionTask> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/action-center/reminders");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load Action Center data");
      }

      setSummary(data.summary);
      setTasks([
        ...(data.summary.all_pending_tasks || []),
        ...(data.summary.completed_tasks || []),
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreateTask(initialData?: Partial<ActionTask>) {
    setModalInitialTask(initialData || null);
    setIsModalOpen(true);
  }

  async function handleSaveTask(taskData: Partial<ActionTask>) {
    try {
      if (taskData.id) {
        // Edit existing task
        const res = await fetch("/api/action-center/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to update task");
      } else {
        // Create new task
        const res = await fetch("/api/action-center/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to create task");
      }
      await loadData();
    } catch (err: unknown) {
      throw err;
    }
  }

  async function handleToggleTask(taskId: string, completed: boolean) {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
      );

      const res = await fetch("/api/action-center/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, completed }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to toggle task");
      await loadData();
    } catch (err) {
      console.error("Toggle error:", err);
      await loadData();
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      const res = await fetch(`/api/action-center/tasks?id=${taskId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete task");
      await loadData();
    } catch (err) {
      console.error("Delete error:", err);
      await loadData();
    }
  }

  async function handleAddSuggestion(sug: SmartSuggestion) {
    await handleSaveTask({
      title: sug.title,
      description: sug.description,
      category: sug.category,
      priority: sug.priority,
      due_date: sug.due_date,
      source_type: sug.source_type,
      source_id: sug.source_id,
    });
  }

  if (loading && !summary) {
    return (
      <div className="p-12 text-center max-w-5xl mx-auto space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-800">Loading Student Action Center...</p>
      </div>
    );
  }

  const todayTasksCount = summary?.today_tasks.length || 0;
  const pendingTasksCount = summary?.all_pending_tasks.length || 0;
  const documentAlertsCount = summary?.document_alerts.length || 0;
  const deadlinesCount = summary?.upcoming_deadlines.length || 0;
  const completedCount = summary?.completed_tasks.length || 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            Unified Academic Planner & Deadline Command Center
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Student Action Center</h1>
          <p className="text-xs text-blue-200">
            Keep track of timetable schedules, certificate expiries, and scholarship deadlines.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateTask()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create New Task
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Center Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("today")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "today"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Today
          {todayTasksCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "today" ? "bg-white text-blue-700" : "bg-blue-100 text-blue-800"
              }`}
            >
              {todayTasksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "calendar"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendar / Timetable
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "tasks"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tasks ({pendingTasksCount})
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "documents"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          Document Reminders
          {documentAlertsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
              {documentAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("deadlines")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "deadlines"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Upcoming Deadlines ({deadlinesCount})
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === "completed"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Completed ({completedCount})
        </button>
      </div>

      {/* TAB CONTENT AREA */}
      {summary && (
        <>
          {activeTab === "today" && (
            <TodayDashboard
              summary={summary}
              onToggleTask={handleToggleTask}
              onOpenCreateTask={handleOpenCreateTask}
              onAddSuggestion={handleAddSuggestion}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView
              tasks={tasks}
              onOpenCreateTask={handleOpenCreateTask}
              onToggleTask={handleToggleTask}
            />
          )}

          {activeTab === "tasks" && (
            <TaskChecklist
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onOpenCreateTask={handleOpenCreateTask}
            />
          )}

          {activeTab === "documents" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Smart Document Expiry Monitor
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Automatically tracks validity periods and notifies before renewal deadlines
                  </p>
                </div>
                <Link
                  href="/dashboard/documents"
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  Manage Documents Vault &rarr;
                </Link>
              </div>

              {summary.document_alerts.length === 0 ? (
                <div className="p-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-800 text-sm">All uploaded certificates are active</p>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    No documents require immediate renewal in the next 30 days.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summary.document_alerts.map((doc) => (
                    <div
                      key={doc.document_id}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        doc.status === "EXPIRED"
                          ? "bg-rose-50/50 border-rose-200 text-rose-900"
                          : "bg-amber-50/50 border-amber-200 text-amber-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs truncate">{doc.document_name}</h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border">
                          {doc.status_label}
                        </span>
                      </div>
                      {doc.recommendation && (
                        <p className="text-[11px] opacity-80">{doc.recommendation}</p>
                      )}
                      <div className="pt-2 flex items-center justify-between">
                        <Link
                          href="/dashboard/documents"
                          className="text-[11px] font-bold text-slate-700 hover:underline"
                        >
                          View in Vault
                        </Link>
                        <button
                          onClick={() =>
                            handleOpenCreateTask({
                              title: `Renew ${doc.document_name}`,
                              category: "Document",
                              priority: "high",
                              due_date: summary.today_date,
                              source_type: "DOCUMENT_EXPIRY",
                              source_id: doc.document_id,
                            })
                          }
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Create Renewal Task
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "deadlines" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    Opportunity Application Deadlines ({summary.upcoming_deadlines.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live closing dates for matched scholarships, grants, and internships
                  </p>
                </div>
                <Link
                  href="/dashboard/scholarships"
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  Browse Scholarships Catalog &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summary.upcoming_deadlines.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase">
                          {opp.type}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            opp.is_urgent ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {opp.days_remaining} days left
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                        {opp.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">{opp.provider}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-emerald-700">{opp.amount_or_stipend}</span>
                      <button
                        onClick={() =>
                          handleOpenCreateTask({
                            title: `Apply for ${opp.title}`,
                            category: opp.type === "SCHOLARSHIP" ? "Scholarship" : "Internship",
                            priority: opp.is_urgent ? "high" : "medium",
                            due_date: opp.deadline,
                            source_type: opp.type === "SCHOLARSHIP" ? "SCHOLARSHIP" : "INTERNSHIP",
                            source_id: opp.id,
                            source_title: opp.title,
                          })
                        }
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        Add Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "completed" && (
            <CompletedHistory
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </>
      )}

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={modalInitialTask}
      />
    </div>
  );
}
