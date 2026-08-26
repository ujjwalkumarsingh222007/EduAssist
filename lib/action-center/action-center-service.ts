import {
  ActionTask,
  SmartReminder,
  SmartSuggestion,
  OpportunityDeadlineItem,
  ActionCenterSummary,
  TaskPriority,
} from "./types";
import { evaluateDocumentExpiry } from "../health/expiry-checker";
import { UNIFIED_OPPORTUNITIES_CATALOG } from "../opportunities/database";
import { Profile, ProfileData } from "../types/profile";

/**
 * Returns today's date in standard ISO YYYY-MM-DD format based on local client time.
 */
export function getTodayDateString(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Computes difference in days between target date string (YYYY-MM-DD) and today.
 */
export function getDaysDifference(targetDateStr: string, todayStr: string = getTodayDateString()): number {
  const target = new Date(targetDateStr);
  const today = new Date(todayStr);
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Parses opportunity deadline string (e.g. "2026-09-15" or "15 September 2026") into YYYY-MM-DD.
 */
function parseDeadlineDate(rawDeadline: string): string | null {
  if (!rawDeadline) return null;
  const clean = rawDeadline.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
}

/**
 * Gathers upcoming scholarship and internship deadlines from our catalog.
 */
export function getIntegratedOpportunityDeadlines(todayStr: string = getTodayDateString()): OpportunityDeadlineItem[] {
  const items: OpportunityDeadlineItem[] = [];

  for (const opp of UNIFIED_OPPORTUNITIES_CATALOG) {
    const deadlineIso = parseDeadlineDate(opp.deadline || "");
    if (deadlineIso) {
      const days = getDaysDifference(deadlineIso, todayStr);
      if (days >= 0 && days <= 90) {
        items.push({
          id: opp.id,
          title: opp.title,
          type: opp.type === "scholarship" ? "SCHOLARSHIP" : "INTERNSHIP",
          provider: opp.organization || "Official Provider",
          deadline: deadlineIso,
          days_remaining: days,
          amount_or_stipend: opp.amount || opp.stipend || "",
          link: opp.type === "scholarship" ? `/dashboard/scholarships` : `/dashboard/internships`,
          is_urgent: days <= 15,
        });
      }
    }
  }

  return items.sort((a, b) => a.days_remaining - b.days_remaining);
}

/**
 * Builds smart action suggestions based on profile completeness, document health, and deadlines.
 */
export function generateSmartSuggestions(
  profile: Profile | null | undefined,
  documents: { id: string; file_name: string; document_type: string; extracted_data?: Record<string, unknown> | null }[],
  existingTasks: ActionTask[],
  todayStr: string = getTodayDateString()
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const existingSourceIds = new Set(existingTasks.filter((t) => !t.completed).map((t) => t.source_id));

  // 1. Document Expiry Suggestions
  for (const doc of documents) {
    const expiryInfo = evaluateDocumentExpiry(doc.id, doc.file_name, doc.document_type, doc.extracted_data);
    if ((expiryInfo.status === "EXPIRING_SOON" || expiryInfo.status === "EXPIRED") && !existingSourceIds.has(doc.id)) {
      suggestions.push({
        id: `sug-doc-${doc.id}`,
        title: `Renew ${doc.file_name}`,
        description: expiryInfo.status === "EXPIRED" ? `Document has expired. Renew with issuing authority.` : `Expires in ${expiryInfo.days_remaining} days (on ${expiryInfo.expiry_date}).`,
        category: "Document",
        priority: expiryInfo.status === "EXPIRED" ? "high" : "medium",
        due_date: expiryInfo.expiry_date || todayStr,
        source_type: "DOCUMENT_EXPIRY",
        source_id: doc.id,
        action_label: "Add Renewal Task",
      });
    }
  }

  // 2. Profile Gaps Suggestions
  const pData: ProfileData = profile?.profile_data || {};
  if (!pData.secondary_10th?.school_name && !existingSourceIds.has("profile-10th")) {
    suggestions.push({
      id: "sug-prof-10th",
      title: "Upload Class 10 Marksheet",
      description: "Extract and verify 10th score, board, and roll number to qualify for scholarships.",
      category: "Document",
      priority: "high",
      due_date: todayStr,
      source_type: "PROFILE_IMPROVEMENT",
      source_id: "profile-10th",
      action_label: "Add to Checklist",
    });
  }

  if (!pData.identity?.aadhaar_number && !existingSourceIds.has("profile-id")) {
    suggestions.push({
      id: "sug-prof-id",
      title: "Verify Government ID (Aadhaar/PAN)",
      description: "Required for state scholarship application verification.",
      category: "Document",
      priority: "medium",
      due_date: todayStr,
      source_type: "PROFILE_IMPROVEMENT",
      source_id: "profile-id",
      action_label: "Add to Checklist",
    });
  }

  // 3. Urgent Scholarship Deadlines Suggestions
  const deadlines = getIntegratedOpportunityDeadlines(todayStr);
  for (const opp of deadlines.slice(0, 2)) {
    if (opp.is_urgent && !existingSourceIds.has(opp.id)) {
      suggestions.push({
        id: `sug-opp-${opp.id}`,
        title: `Submit ${opp.title} Application`,
        description: `Official deadline closes in ${opp.days_remaining} days (${opp.deadline}).`,
        category: "Scholarship",
        priority: "high",
        due_date: opp.deadline,
        source_type: "SCHOLARSHIP",
        source_id: opp.id,
        action_label: "Add Application Task",
      });
    }
  }

  return suggestions;
}

/**
 * Builds the comprehensive Action Center Summary for the authenticated user.
 */
export function buildActionCenterSummary(
  userId: string,
  tasks: ActionTask[],
  documents: { id: string; file_name: string; document_type: string; extracted_data?: Record<string, unknown> | null }[],
  profile: Profile | null | undefined,
  dismissedReminderIds: string[] = [],
  todayStr: string = getTodayDateString()
): ActionCenterSummary {
  const userTasks = tasks.filter((t) => t.user_id === userId);

  const todayTasks = userTasks.filter((t) => !t.completed && t.due_date === todayStr);
  const pendingTasks = userTasks.filter((t) => !t.completed);
  const completedTasks = userTasks.filter((t) => t.completed).sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
  const overdueTasks = userTasks.filter((t) => !t.completed && t.due_date < todayStr);

  // Document Alerts
  const documentAlerts = documents
    .map((doc) => {
      const exp = evaluateDocumentExpiry(doc.id, doc.file_name, doc.document_type, doc.extracted_data);
      return {
        document_id: doc.id,
        document_name: doc.file_name,
        document_type: doc.document_type,
        status: exp.status,
        status_label: exp.status_label,
        days_remaining: exp.days_remaining,
        recommendation: exp.recommendation,
      };
    })
    .filter((d) => d.status === "EXPIRING_SOON" || d.status === "EXPIRED");

  // Upcoming Deadlines
  const upcomingDeadlines = getIntegratedOpportunityDeadlines(todayStr);

  // Smart Suggestions
  const smartSuggestions = generateSmartSuggestions(profile, documents, userTasks, todayStr);

  // Active Reminders
  const activeReminders: SmartReminder[] = [];

  // Overdue tasks reminders
  for (const ot of overdueTasks) {
    const remId = `rem-task-${ot.id}`;
    if (!dismissedReminderIds.includes(remId)) {
      activeReminders.push({
        id: remId,
        user_id: userId,
        task_id: ot.id,
        title: `Overdue: ${ot.title}`,
        message: `Was due on ${ot.due_date}`,
        severity: "high",
        type: "TASK",
        due_date: ot.due_date,
        due_time: ot.start_time,
        link: `/dashboard/action-center?tab=tasks`,
      });
    }
  }

  // Today's high priority tasks
  for (const tt of todayTasks.filter((t) => t.priority === "high")) {
    const remId = `rem-today-${tt.id}`;
    if (!dismissedReminderIds.includes(remId)) {
      activeReminders.push({
        id: remId,
        user_id: userId,
        task_id: tt.id,
        title: tt.title,
        message: tt.start_time ? `Scheduled for today at ${tt.start_time}` : `Due today`,
        severity: "high",
        type: "TASK",
        due_date: tt.due_date,
        due_time: tt.start_time,
        link: `/dashboard/action-center?tab=today`,
      });
    }
  }

  // Expiring document alerts
  for (const docAlert of documentAlerts) {
    const remId = `rem-doc-${docAlert.document_id}`;
    if (!dismissedReminderIds.includes(remId)) {
      activeReminders.push({
        id: remId,
        user_id: userId,
        document_id: docAlert.document_id,
        title: docAlert.status === "EXPIRED" ? `Document Expired: ${docAlert.document_name}` : `Expiring Soon: ${docAlert.document_name}`,
        message: docAlert.status_label,
        severity: docAlert.status === "EXPIRED" ? "high" : "medium",
        type: "DOCUMENT_EXPIRY",
        due_date: todayStr,
        link: `/dashboard/documents`,
      });
    }
  }

  // Urgent opportunity deadlines
  for (const opp of upcomingDeadlines.filter((o) => o.is_urgent).slice(0, 3)) {
    const remId = `rem-opp-${opp.id}`;
    if (!dismissedReminderIds.includes(remId)) {
      activeReminders.push({
        id: remId,
        user_id: userId,
        opportunity_id: opp.id,
        title: `Deadline Approaching: ${opp.title}`,
        message: `Closes in ${opp.days_remaining} days (${opp.deadline})`,
        severity: "medium",
        type: "DEADLINE",
        due_date: opp.deadline,
        link: opp.link,
      });
    }
  }

  return {
    today_date: todayStr,
    today_tasks: todayTasks,
    all_pending_tasks: pendingTasks,
    completed_tasks: completedTasks,
    overdue_tasks: overdueTasks,
    document_alerts: documentAlerts,
    upcoming_deadlines: upcomingDeadlines,
    smart_suggestions: smartSuggestions,
    active_reminders: activeReminders,
    badge_count: activeReminders.length,
  };
}
