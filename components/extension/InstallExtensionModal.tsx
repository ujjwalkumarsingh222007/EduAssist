"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  Puzzle,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Folder,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { checkExtensionInstallation } from "@/lib/extension/detection";

interface InstallExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstalled?: () => void;
}

export function InstallExtensionModal({
  isOpen,
  onClose,
  onInstalled,
}: InstallExtensionModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [checking, setChecking] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<"idle" | "detected" | "not_found">("idle");
  const [detectedVersion, setDetectedVersion] = useState<string>("");

  if (!isOpen) return null;

  function handleCopyExtensionsUrl() {
    navigator.clipboard.writeText("chrome://extensions");
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  }

  async function handleCheckInstallation() {
    setChecking(true);
    setDetectionStatus("idle");

    try {
      const result = await checkExtensionInstallation(800);
      if (result.installed) {
        setDetectionStatus("detected");
        setDetectedVersion(result.version || "1.0.0");
        if (onInstalled) onInstalled();
      } else {
        setDetectionStatus("not_found");
      }
    } catch {
      setDetectionStatus("not_found");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <Puzzle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Install Smart Education Assistant
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Development installation guide for Google Chrome.
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-slate-900">
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
            Developer Installation Guide
          </p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Because this is a development build, Chrome requires you to load the extension folder manually via Developer Mode.
          </p>
        </div>

        {/* Installation Steps */}
        <div className="space-y-3">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">Open Chrome Extensions</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Paste <code className="bg-white px-1.5 py-0.5 border rounded text-slate-800 font-mono text-[11px]">chrome://extensions</code> into your Chrome address bar.
              </p>
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={handleCopyExtensionsUrl}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-white border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? "Copied URL" : "Copy chrome://extensions"}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">Enable Developer Mode</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Toggle the <strong>Developer mode</strong> switch located in the top-right corner.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">Click &quot;Load unpacked&quot;</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click the <strong>Load unpacked</strong> button that appears in the top-left toolbar.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              4
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">Select the &quot;extension&quot; Folder</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Select the <code className="bg-white px-1.5 py-0.5 border rounded text-slate-800 font-semibold text-[11px]">extension</code> folder from your project directory.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50/40">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              5
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">Return Here & Check Installation</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click <strong>Check Installation</strong> below to confirm detection.
              </p>
            </div>
          </div>
        </div>

        {/* Reload Note */}
        <div className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">
          💡 <strong>Tip:</strong> If you update the extension code or manifest, click <strong>Reload</strong> on the extension card in <code className="font-mono">chrome://extensions</code>.
        </div>

        {/* Verification Status Feedback */}
        {detectionStatus === "detected" && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Extension detected ✓ (v{detectedVersion})
            </div>
            <p className="text-emerald-700 text-[11px]">
              The Smart Education Assistant extension is active in your browser.
            </p>
            <div className="pt-1">
              <Link
                href="/dashboard/extension"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Connect Account <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {detectionStatus === "not_found" && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl text-xs space-y-1 animate-in fade-in">
            <p className="font-bold flex items-center gap-1.5 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Extension not detected
            </p>
            <p className="text-rose-700 text-[11px]">
              Please make sure the extension is enabled in Chrome and click Check Installation again.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCheckInstallation}
            disabled={checking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-xs"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking Installation...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Check Installation
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto text-xs font-semibold text-slate-500 hover:text-slate-700 px-4 py-2"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
