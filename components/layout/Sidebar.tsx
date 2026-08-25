"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  FileText,
  Compass,
  Award,
  Briefcase,
  FileSpreadsheet,
  Bot,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: Compass },
  { href: "/dashboard/scholarships", label: "Scholarships", icon: Award },
  { href: "/dashboard/internships", label: "Internships", icon: Briefcase },
  { href: "/dashboard/forms", label: "Form Assistant", icon: FileSpreadsheet },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Bot },
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

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
