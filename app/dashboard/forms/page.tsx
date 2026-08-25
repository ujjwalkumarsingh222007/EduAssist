import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Globe, ShieldCheck, Sparkles } from "lucide-react";
import ControlledBrowserWorkspace from "@/components/browser/ControlledBrowserWorkspace";

export default async function FormsAssistantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Official Portal Browser Workspace</h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Live Browser Session
          </span>
        </div>
        <p className="text-slate-500 text-sm">
          Access the original official scholarship application portal directly through our controlled Playwright browser workspace. AI inspects the live page and populates supported fields with your verified profile data. You retain full interactive control to solve CAPTCHAs, review, and manually submit on the official website.
        </p>
      </div>

      {/* Controlled Browser Workspace */}
      <ControlledBrowserWorkspace />
    </div>
  );
}
