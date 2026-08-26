"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Tag,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { ActionTask, TaskCategory, TaskPriority } from "@/lib/action-center/types";
import { getTodayDateString } from "@/lib/action-center/action-center-service";

interface TaskChecklistProps {
  tasks: ActionTask[];
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onOpenCreateTask: (initialData?: Partial<ActionTask>) => void;
}

const CATEGORIES: (TaskCategory | "ALL")[] = [
  "ALL",
  "Study",
  "Exam",
  "Assignment",
  "Project",
  "Internship",
  "Scholarship",
  "Application",
  "Document",
  "Personal",
];

export default function TaskChecklist({
  tasks,
  onToggleTask,
  onDeleteTask,
  onOpenCreateTask,
}: TaskChecklistProps) {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | "ALL">("ALL");
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickCategory, setQuickCategory] = useState<TaskCategory>("Study");

  const todayStr = getTodayDateString();

  // Filter tasks
  const pendingTasks = tasks.filter((t) => !t.completed);

  const filteredTasks = pendingTasks.filter((t) => {
    if (selectedCategory !== "ALL" && t.category !== selectedCategory) return false;
    if (selectedPriority !== "ALL" && t.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    await onOpenCreateTask({
      title: quickTitle.trim(),
      category: quickCategory,
      priority: "medium",
      due_date: todayStr,
    });
    setQuickTitle("");
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs space-y-0">
      {/* Header & Filter Controls */}
      <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              Active Task Checklist ({pendingTasks.length})
            </h3>
            <p className="text-[11px] text-slate-500">Track and check off your academic milestones</p>
          </div>

          <button
            onClick={() => onOpenCreateTask({ due_date: todayStr })}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            + New Task
          </button>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick add: e.g. Revise Calculus, Upload Domicile Certificate..."
            className="flex-1 min-w-[200px] p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-medium text-slate-900 shadow-2xs"
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value as TaskCategory)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700 shadow-2xs"
          >
            {CATEGORIES.filter((c) => c !== "ALL").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-2xs shrink-0"
          >
            Add
          </button>
        </form>

        {/* Category & Priority Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  selectedCategory === c
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400">Priority:</span>
            {(["ALL", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedPriority === p
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-slate-100">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckSquare className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No tasks matching your filter</p>
            <p className="text-slate-400 text-xs">
              {pendingTasks.length === 0
                ? "You have no active tasks. Click '+ New Task' above to start planning."
                : "Try selecting another category or clearing search filters."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = task.due_date < todayStr;
            const isHigh = task.priority === "high";
            const isMed = task.priority === "medium";

            return (
              <div
                key={task.id}
                className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => onToggleTask(task.id, e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-xs">{task.title}</p>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                          isHigh
                            ? "bg-rose-100 text-rose-800"
                            : isMed
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {task.category}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span className={isOverdue ? "text-rose-600 font-bold" : ""}>
                        Due: {task.due_date} {task.start_time ? `at ${task.start_time}` : ""}
                        {isOverdue && " (Overdue)"}
                      </span>
                      {task.recurrence !== "none" && (
                        <span>• Repeats: {task.recurrence}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onOpenCreateTask(task)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Edit Task"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
