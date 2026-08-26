"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Save,
  Clock,
  Calendar,
  AlertCircle,
  Tag,
  Repeat,
  Bell,
  Sparkles,
} from "lucide-react";
import { ActionTask, TaskCategory, TaskPriority, TaskRecurrence, ReminderOffset } from "@/lib/action-center/types";
import { getTodayDateString } from "@/lib/action-center/action-center-service";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<ActionTask>) => Promise<void>;
  initialTask?: Partial<ActionTask> | null;
}

const CATEGORIES: TaskCategory[] = [
  "Study",
  "Exam",
  "Assignment",
  "Project",
  "Internship",
  "Scholarship",
  "Application",
  "Document",
  "Personal",
  "Other",
];

export default function TaskModal({ isOpen, onClose, onSave, initialTask }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("Study");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none");
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset>("15m");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || "");
      setDescription(initialTask.description || "");
      setCategory(initialTask.category || "Study");
      setPriority(initialTask.priority || "medium");
      setDueDate(initialTask.due_date || getTodayDateString());
      setStartTime(initialTask.start_time || "09:00");
      setEndTime(initialTask.end_time || "10:00");
      setAllDay(initialTask.all_day ?? false);
      setRecurrence(initialTask.recurrence || "none");
      setReminderOffset(initialTask.reminder_offset || "15m");
    } else {
      setTitle("");
      setDescription("");
      setCategory("Study");
      setPriority("medium");
      setDueDate(getTodayDateString());
      setStartTime("09:00");
      setEndTime("10:00");
      setAllDay(false);
      setRecurrence("none");
      setReminderOffset("15m");
    }
    setError("");
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a task title");
      return;
    }
    if (!dueDate) {
      setError("Please select a due date");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSave({
        id: initialTask?.id,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        due_date: dueDate,
        start_time: allDay ? undefined : startTime,
        end_time: allDay ? undefined : endTime,
        all_day: allDay,
        recurrence,
        reminder_offset: reminderOffset,
        source_type: initialTask?.source_type || "MANUAL",
        source_id: initialTask?.source_id,
        source_title: initialTask?.source_title,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {initialTask?.id ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {initialTask?.id ? "Edit Task / Activity" : "Create New Task or Activity"}
              </h3>
              <p className="text-[11px] text-slate-500">Plan your timetable, assignments, and reminders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Task / Activity Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Revise DBMS Normalization, Submit NSP Scholarship Form..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-900"
              required
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-900"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Priority</label>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setPriority("low")}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    priority === "low"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  🟢 Low
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("medium")}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    priority === "medium"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  🟡 Med
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("high")}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    priority === "high"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  🔴 High
                </button>
              </div>
            </div>
          </div>

          {/* Date & All-Day */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                Due Date
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-[11px]">All Day Task</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-900 sm:col-span-1"
                required
              />

              {!allDay && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Start:</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-900"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">End:</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-900"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recurrence & Reminders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Repeat className="w-3 h-3 text-slate-500" />
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-900"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Every Weekday (Mon–Fri)</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Bell className="w-3 h-3 text-slate-500" />
                Reminder
              </label>
              <select
                value={reminderOffset}
                onChange={(e) => setReminderOffset(e.target.value as ReminderOffset)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-900"
              >
                <option value="none">No reminder</option>
                <option value="at_time">At time of event</option>
                <option value="5m">5 minutes before</option>
                <option value="15m">15 minutes before</option>
                <option value="30m">30 minutes before</option>
                <option value="1h">1 hour before</option>
                <option value="1d">1 day before</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add chapters, study links, or application requirements..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-900 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : initialTask?.id ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
