"use client";

import React, { useState } from "react";
import { CheckCircle2, RotateCcw, Calendar, Tag, Trash2 } from "lucide-react";
import { ActionTask } from "@/lib/action-center/types";
import { getTodayDateString } from "@/lib/action-center/action-center-service";

interface CompletedHistoryProps {
  tasks: ActionTask[];
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export default function CompletedHistory({
  tasks,
  onToggleTask,
  onDeleteTask,
}: CompletedHistoryProps) {
  const [filterPeriod, setFilterPeriod] = useState<"today" | "week" | "month" | "all">("all");

  const completedTasks = tasks.filter((t) => t.completed);
  const todayStr = getTodayDateString();

  const filteredTasks = completedTasks.filter((t) => {
    if (filterPeriod === "all") return true;
    if (!t.completed_at) return true;
    const compDateStr = t.completed_at.split("T")[0];
    if (filterPeriod === "today") return compDateStr === todayStr;
    // Week check (last 7 days)
    const diffDays = (new Date(todayStr).getTime() - new Date(compDateStr).getTime()) / (1000 * 3600 * 24);
    if (filterPeriod === "week") return diffDays >= 0 && diffDays <= 7;
    if (filterPeriod === "month") return diffDays >= 0 && diffDays <= 30;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs space-y-0">
      {/* Header & Filter */}
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Completed Milestones ({completedTasks.length})
          </h3>
          <p className="text-[11px] text-slate-500">History of your accomplished tasks and submissions</p>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
          {(["all", "today", "week", "month"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                filterPeriod === period
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {period === "all" ? "All Time" : period === "week" ? "This Week" : period === "month" ? "This Month" : "Today"}
            </button>
          ))}
        </div>
      </div>

      {/* Completed List */}
      <div className="divide-y divide-slate-100">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No completed tasks in this period</p>
            <p className="text-slate-400 text-xs">
              Completed items from your checklist will be archived here.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors group"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-xs line-through">{task.title}</p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                      {task.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Completed: {task.completed_at ? new Date(task.completed_at).toLocaleString() : "Recently"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onToggleTask(task.id, false)}
                  className="px-2.5 py-1 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold flex items-center gap-1"
                  title="Reopen Task"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reopen
                </button>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Delete Forever"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
