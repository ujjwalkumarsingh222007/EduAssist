"use client";

import Link from "next/link";
import {
  Puzzle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { InstallExtensionButton } from "./InstallExtensionButton";
import { useExtensionDetector } from "@/lib/extension/detection";

interface DashboardExtensionCardProps {
  userId?: string;
}

export function DashboardExtensionCard({ userId }: DashboardExtensionCardProps) {
  const { state, checking, checkStatus } = useExtensionDetector(userId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs shrink-0">
            <Puzzle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Official Browser Companion
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-600 border border-slate-200">
                v1.0
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Smart Education Assistant Extension
            </h2>
          </div>
        </div>

        {/* Dynamic Status Badges */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {checking ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              Checking extension...
            </span>
          ) : state === "connected" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Extension connected ✓
            </span>
          ) : state === "detected" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Extension detected ✓
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Extension not detected
            </span>
          )}

          <button
            type="button"
            onClick={checkStatus}
            disabled={checking}
            title="Check extension installation"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-3xl">
        Fill supported education, scholarship and application forms using your verified student profile.
      </p>

      {/* 4 Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-semibold text-slate-900 block">AI Form Detection</span>
            <span className="text-[11px] text-slate-500">Inspects form fields on official portals</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-semibold text-slate-900 block">Verified Student Profile</span>
            <span className="text-[11px] text-slate-500">Maps canonical verified attributes</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-semibold text-slate-900 block">Review Before Filling</span>
            <span className="text-[11px] text-slate-500">You maintain complete visibility</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-semibold text-slate-900 block">Your Security Control</span>
            <span className="text-[11px] text-slate-500">CAPTCHA & OTP remain under your control</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
        {state === "connected" ? (
          <>
            <Link
              href="/dashboard/extension"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
            >
              <Puzzle className="w-4 h-4" />
              Manage Extension Connection <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        ) : state === "detected" ? (
          <>
            <Link
              href="/dashboard/extension"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
            >
              <Zap className="w-4 h-4" />
              Connect Account <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        ) : (
          <>
            <InstallExtensionButton
              variant="primary"
              onInstalled={checkStatus}
            >
              Install Extension
            </InstallExtensionButton>

            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              Check Installation
            </button>
          </>
        )}
      </div>
    </div>
  );
}
