import Sidebar from "@/components/layout/Sidebar";
import HeaderReminderCenter from "@/components/action-center/HeaderReminderCenter";
import Link from "next/link";
import { User, CalendarCheck } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Universal Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/action-center"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Action Center</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <HeaderReminderCenter />
            <div className="h-4 w-px bg-slate-200" />
            <Link
              href="/dashboard/profile"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="My Student Profile"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
