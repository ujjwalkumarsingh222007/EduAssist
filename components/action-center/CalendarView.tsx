"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { ActionTask } from "@/lib/action-center/types";
import { getTodayDateString } from "@/lib/action-center/action-center-service";

interface CalendarViewProps {
  tasks: ActionTask[];
  onOpenCreateTask: (initialData?: Partial<ActionTask>) => void;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
}

type CalendarMode = "month" | "week" | "day";

export default function CalendarView({ tasks, onOpenCreateTask, onToggleTask }: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const todayStr = getTodayDateString();

  // Navigation helpers
  function prevPeriod() {
    const next = new Date(currentDate);
    if (mode === "month") next.setMonth(next.getMonth() - 1);
    else if (mode === "week") next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  }

  function nextPeriod() {
    const next = new Date(currentDate);
    if (mode === "month") next.setMonth(next.getMonth() + 1);
    else if (mode === "week") next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  const titleHeader = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    ...(mode === "day" ? { day: "numeric", weekday: "short" } : {}),
  });

  // Generate Month Days Grid (6 weeks = 42 cells)
  function getMonthDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = prevDate.toISOString().split("T")[0];
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = curDate.toISOString().split("T")[0];
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = nextDate.toISOString().split("T")[0];
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }

  // Generate Week Days (7 days)
  function getWeekDays() {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const week: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      week.push({
        dateStr,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return week;
  }

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 AM to 10:00 PM

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col space-y-0 text-xs">
      {/* Calendar Header Controls */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{titleHeader}</h3>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={prevPeriod}
              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="px-2.5 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50 rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextPeriod}
              className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setMode("month")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                mode === "month" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setMode("week")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                mode === "week" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setMode("day")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                mode === "day" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Day
            </button>
          </div>

          <button
            onClick={() => onOpenCreateTask({ due_date: todayStr })}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {mode === "month" && (
        <div>
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/60 text-center font-bold text-[11px] text-slate-500 py-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* 42 Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {getMonthDays().map((dayObj, idx) => {
              const isToday = dayObj.dateStr === todayStr;
              const dayTasks = tasks.filter((t) => t.due_date === dayObj.dateStr);

              return (
                <div
                  key={idx}
                  onClick={() => onOpenCreateTask({ due_date: dayObj.dateStr })}
                  className={`min-h-24 p-1.5 flex flex-col justify-between hover:bg-blue-50/30 transition-colors cursor-pointer group ${
                    !dayObj.isCurrentMonth ? "bg-slate-50/50 opacity-40" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-bold ${
                        isToday ? "bg-blue-600 text-white" : "text-slate-700"
                      }`}
                    >
                      {dayObj.dayNum}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 font-bold">
                      +
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCreateTask(t);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] truncate font-medium flex items-center gap-1 ${
                          t.completed
                            ? "bg-slate-100 text-slate-400 line-through"
                            : t.priority === "high"
                            ? "bg-rose-100 text-rose-800 font-bold"
                            : t.priority === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-50 text-blue-700"
                        }`}
                        title={t.title}
                      >
                        {t.start_time && <span className="font-mono text-[9px]">{t.start_time}</span>}
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-semibold pl-1">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {mode === "week" && (
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 divide-x divide-slate-200">
              {getWeekDays().map((w) => (
                <div key={w.dateStr} className="px-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{w.dayName}</span>
                  <p
                    className={`text-sm font-extrabold mt-0.5 ${
                      w.isToday ? "text-blue-600 font-black" : "text-slate-800"
                    }`}
                  >
                    {w.dayNum}
                  </p>
                </div>
              ))}
            </div>

            {/* Week Days Columns */}
            <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[400px]">
              {getWeekDays().map((w) => {
                const dayTasks = tasks.filter((t) => t.due_date === w.dateStr);

                return (
                  <div
                    key={w.dateStr}
                    onClick={() => onOpenCreateTask({ due_date: w.dateStr })}
                    className="p-2 space-y-2 hover:bg-blue-50/20 transition-colors cursor-pointer"
                  >
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCreateTask(t);
                        }}
                        className={`p-2 rounded-xl border text-xs space-y-1 ${
                          t.completed
                            ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                            : t.priority === "high"
                            ? "bg-rose-50 border-rose-200 text-rose-900"
                            : "bg-blue-50/50 border-blue-200 text-blue-900"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase">{t.category}</span>
                          {t.start_time && <span className="font-mono text-[10px]">{t.start_time}</span>}
                        </div>
                        <p className="font-bold text-slate-900 text-xs truncate">{t.title}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {mode === "day" && (
        <div className="p-6 space-y-4">
          {/* Day All-Day Tasks */}
          {(() => {
            const curDateStr = currentDate.toISOString().split("T")[0];
            const allDayTasks = tasks.filter((t) => t.due_date === curDateStr && t.all_day);
            const hourlyTasks = tasks.filter((t) => t.due_date === curDateStr && !t.all_day);

            return (
              <>
                {allDayTasks.length > 0 && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                      All-Day Activities
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {allDayTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => onOpenCreateTask(t)}
                          className="px-3 py-1 bg-white rounded-lg border border-purple-200 font-bold text-purple-900 text-xs cursor-pointer shadow-2xs"
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hourly Timetable Slots */}
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {hours.map((hour) => {
                    const hourStr = `${String(hour).padStart(2, "0")}:00`;
                    const matchingTasks = hourlyTasks.filter((t) => t.start_time && t.start_time.startsWith(String(hour).padStart(2, "0")));

                    return (
                      <div
                        key={hour}
                        onClick={() => onOpenCreateTask({ due_date: curDateStr, start_time: hourStr })}
                        className="p-3 flex items-start gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <span className="w-14 font-mono font-bold text-slate-400 text-xs pt-0.5">
                          {hourStr}
                        </span>
                        <div className="flex-1 space-y-1.5">
                          {matchingTasks.map((t) => (
                            <div
                              key={t.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCreateTask(t);
                              }}
                              className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-900 text-xs shadow-2xs flex items-center justify-between"
                            >
                              <span>{t.title}</span>
                              <span className="text-[10px] font-normal text-slate-500">
                                {t.start_time} – {t.end_time || ""} ({t.category})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
