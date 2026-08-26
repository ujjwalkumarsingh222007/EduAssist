"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  User,
  FileText,
  Compass,
  Award,
  Briefcase,
  LogOut,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const profileNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/action-center", label: "Action Center", icon: CalendarCheck },
  { href: "/dashboard/profile", label: "My Profile", icon: User },
  { href: "/dashboard/documents", label: "Documents & Health", icon: FileText },
];

const contentNavItems = [
  { href: "/dashboard/scholarships", label: "Scholarships", icon: Award },
  { href: "/dashboard/internships", label: "Internships", icon: Briefcase },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: Compass },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="w-64 shrink-0 border-r bg-white flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 border-b flex items-center px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-blue-600"
        >
          <GraduationCap className="w-5 h-5" />
          <span>EduAssist</span>
        </Link>
      </div>

      {/* Navigation Areas */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {/* MY PROFILE AREA */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              My Profile
            </span>
          </div>
          <div className="space-y-1">
            {profileNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* CONTENT & OPPORTUNITIES AREA */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Content & Opportunities
            </span>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>
          <div className="space-y-1">
            {contentNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
