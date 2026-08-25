import { Bot } from "lucide-react";

export default function AssistantPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Assistant</h1>
        <p className="text-slate-500 text-sm mt-1">Get personalized help with your academic tasks.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center min-h-64">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-4">
          <Bot className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="font-semibold text-slate-900 mb-2">AI Assistant coming soon</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Phase 4 will connect Gemini AI to help you with forms, essays, and eligibility checks.
        </p>
        <span className="mt-4 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
          Coming in Phase 4
        </span>
      </div>
    </div>
  );
}
