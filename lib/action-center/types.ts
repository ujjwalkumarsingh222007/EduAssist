export type TaskCategory =
  | "Study"
  | "Exam"
  | "Assignment"
  | "Project"
  | "Internship"
  | "Scholarship"
  | "Application"
  | "Document"
  | "Personal"
  | "Other";

export type TaskPriority = "high" | "medium" | "low";

export type TaskRecurrence = "none" | "daily" | "weekly" | "weekdays" | "custom";

export type ReminderOffset = "none" | "at_time" | "5m" | "15m" | "30m" | "1h" | "1d";

export type TaskSourceType =
  | "MANUAL"
  | "DOCUMENT_EXPIRY"
  | "SCHOLARSHIP"
  | "INTERNSHIP"
  | "PROFILE_IMPROVEMENT";

export interface ActionTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  due_date: string; // YYYY-MM-DD
  start_time?: string; // HH:mm (e.g. "09:00")
  end_time?: string; // HH:mm (e.g. "11:00")
  all_day: boolean;
  completed: boolean;
  completed_at?: string | null;
  recurrence: TaskRecurrence;
  reminder_offset: ReminderOffset;
  source_type: TaskSourceType;
  source_id?: string;
  source_title?: string;
  created_at: string;
  updated_at: string;
}

export interface SmartReminder {
  id: string;
  user_id: string;
  title: string;
  message: string;
  severity: "high" | "medium" | "low";
  type: "TASK" | "DOCUMENT_EXPIRY" | "DEADLINE" | "PROFILE";
  due_date: string;
  due_time?: string;
  snoozed_until?: string | null;
  is_dismissed?: boolean;
  link?: string;
  task_id?: string;
  document_id?: string;
  opportunity_id?: string;
}

export interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  due_date: string;
  source_type: TaskSourceType;
  source_id?: string;
  action_label: string;
}

export interface OpportunityDeadlineItem {
  id: string;
  title: string;
  type: "SCHOLARSHIP" | "INTERNSHIP";
  provider: string;
  deadline: string; // YYYY-MM-DD
  days_remaining: number;
  amount_or_stipend?: string;
  link: string;
  is_urgent: boolean;
}

export interface ActionCenterSummary {
  today_date: string;
  today_tasks: ActionTask[];
  all_pending_tasks: ActionTask[];
  completed_tasks: ActionTask[];
  overdue_tasks: ActionTask[];
  document_alerts: {
    document_id: string;
    document_name: string;
    document_type: string;
    status: "EXPIRING_SOON" | "EXPIRED" | "ACTIVE" | "NO_EXPIRY_INFORMATION";
    status_label: string;
    days_remaining?: number | null;
    recommendation?: string;
  }[];
  upcoming_deadlines: OpportunityDeadlineItem[];
  smart_suggestions: SmartSuggestion[];
  active_reminders: SmartReminder[];
  badge_count: number;
}
