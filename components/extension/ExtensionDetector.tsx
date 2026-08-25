"use client";

import { useExtensionDetector } from "@/lib/extension/detection";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ExtensionDetectorProps {
  userId?: string;
  onStatusChange?: (status: "checking" | "not_detected" | "detected" | "connected") => void;
}

export function ExtensionDetector({ userId }: ExtensionDetectorProps) {
  const { mounted, state, checking } = useExtensionDetector(userId);

  if (!mounted || checking || state === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
        Checking extension...
      </span>
    );
  }

  if (state === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Extension connected ✓
      </span>
    );
  }

  if (state === "detected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
        Extension detected ✓
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
      Extension not detected
    </span>
  );
}
