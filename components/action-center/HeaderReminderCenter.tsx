"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Clock,
  AlertCircle,
  FileText,
  GraduationCap,
  Briefcase,
  X,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { SmartReminder } from "@/lib/action-center/types";
import Link from "next/link";

interface HeaderReminderCenterProps {
  initialReminders?: SmartReminder[];
  initialBadgeCount?: number;
}

export default function HeaderReminderCenter({
  initialReminders = [],
  initialBadgeCount = 0,
}: HeaderReminderCenterProps) {
  const [reminders, setReminders] = useState<SmartReminder[]>(initialReminders);
  const [badgeCount, setBadgeCount] = useState(initialBadgeCount);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchReminders() {
    try {
      const res = await fetch("/api/action-center/reminders");
      const data = await res.json();
      if (data.success && data.summary) {
        setReminders(data.summary.active_reminders || []);
        setBadgeCount(data.summary.badge_count || 0);
      }
    } catch (err) {
      // Quietly ignore fetch errors in background polling
    }
  }

  async function handleDismiss(reminderId: string) {
    try {
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      setBadgeCount((prev) => Math.max(0, prev - 1));

      await fetch("/api/action-center/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", reminder_id: reminderId }),
      });
    } catch (err) {
      console.error("Dismiss error:", err);
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
        title="Student Reminders & Alerts"
      >
        <Bell className="w-5 h-5" />
        {badgeCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-extrabold text-white bg-rose-600 rounded-full animate-in zoom-in-75">
            {badgeCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Student Alerts ({reminders.length})
              </h3>
            </div>
            <Link
              href="/dashboard/action-center"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-blue-600 hover:underline"
            >
              Action Center &rarr;
            </Link>
          </div>

          {/* Reminders List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
            {reminders.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-800 text-xs">All clear! No pending alerts.</p>
                <p className="text-[11px] text-slate-400">
                  Deadlines, document expiries, and scheduled tasks will notify you here.
                </p>
              </div>
            ) : (
              reminders.map((rem) => {
                const isHigh = rem.severity === "high";

                return (
                  <div
                    key={rem.id}
                    className={`p-3 rounded-xl m-1 transition-colors ${
                      isHigh ? "bg-rose-50/50 hover:bg-rose-50" : "bg-slate-50/70 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {rem.type === "DOCUMENT_EXPIRY" ? (
                          <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        ) : rem.type === "DEADLINE" ? (
                          <GraduationCap className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">{rem.title}</p>
                          <p className="text-[11px] text-slate-500">{rem.message}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDismiss(rem.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 transition-colors shrink-0"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {rem.link && (
                      <div className="pt-2 flex justify-end">
                        <Link
                          href={rem.link}
                          onClick={() => setIsOpen(false)}
                          className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          View Details <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
