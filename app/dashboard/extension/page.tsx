"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Puzzle,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronDown,
  Zap,
  Lock,
  AlertCircle,
  Folder,
  ArrowRight,
} from "lucide-react";
import { InstallExtensionButton } from "@/components/extension/InstallExtensionButton";
import { useExtensionDetector } from "@/lib/extension/detection";

export default function ExtensionConnectDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [studentName, setStudentName] = useState("");

  // Extension Detector Hook
  const { state: extState, checking: extChecking, checkStatus } = useExtensionDetector(userId);

  // Pairing code state
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Collapsible Developer Guide
  const [devGuideOpen, setDevGuideOpen] = useState(false);
  const [copiedExtensionsUrl, setCopiedExtensionsUrl] = useState(false);

  const pairingSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setPairingCode(null);
        setExpiresAt(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  async function loadUser() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/auth/login?callbackUrl=/dashboard/extension");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      setStudentName(profile?.full_name || (user.user_metadata?.name as string) || "Student");
    } catch (err: unknown) {
      console.error("Load user error:", err);
      setErrorMessage("Could not load user profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateCode() {
    try {
      setGenerating(true);
      setErrorMessage("");
      setCopied(false);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/extension/code/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await res.json();

      if (!res.ok || !data.code) {
        setErrorMessage(data.error || "Failed to generate pairing code.");
        return;
      }

      setPairingCode(data.code);
      setExpiresAt(data.expires_at);
      setTimeLeft(data.expires_in_seconds || 300);
    } catch (err: unknown) {
      console.error("Generate code error:", err);
      setErrorMessage("Network error generating connection code.");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopyCode() {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleCopyExtensionsUrl() {
    navigator.clipboard.writeText("chrome://extensions");
    setCopiedExtensionsUrl(true);
    setTimeout(() => setCopiedExtensionsUrl(false), 2500);
  }

  function scrollToPairing() {
    if (pairingSectionRef.current) {
      pairingSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-500 text-sm">Loading extension companion...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-600">Extension Setup</span>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* ========================================================= */}
      {/* PART 1: MAIN PRODUCT HERO CARD                            */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Title and Dynamic Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs shrink-0">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Official Companion
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-600 border border-slate-200">
                  v1.0
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
                Smart Education Assistant Extension
              </h1>
            </div>
          </div>

          {/* Dynamic Status Badges */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {extChecking ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Checking extension...
              </span>
            ) : extState === "connected" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Extension connected ✓
              </span>
            ) : extState === "detected" ? (
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
              disabled={extChecking}
              title="Re-check extension"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${extChecking ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-3xl">
          Fill supported education, scholarship and application forms using your verified student profile.
        </p>

        {/* Four Value Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-slate-900 block">AI Form Detection</span>
              <span className="text-[11px] text-slate-500">Inspects input elements accurately</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Verified Student Profile</span>
              <span className="text-[11px] text-slate-500">Maps canonical verified data</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Review Before Filling</span>
              <span className="text-[11px] text-slate-500">You review each field mapping</span>
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

        {/* Dynamic Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
          {extState === "connected" ? (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Account Connected to {studentName} ({userEmail})
              </span>
              <button
                type="button"
                onClick={scrollToPairing}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors border border-blue-200"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Manage Pairing Code
              </button>
            </div>
          ) : extState === "detected" ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToPairing}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
              >
                <Zap className="w-4 h-4" />
                Connect Account <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-500">
                Extension ready in browser. Generate code below to link.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <InstallExtensionButton
                variant="primary"
                onInstalled={checkStatus}
              >
                Install Extension
              </InstallExtensionButton>

              <button
                type="button"
                onClick={checkStatus}
                disabled={extChecking}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${extChecking ? "animate-spin" : ""}`} />
                Check Installation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* PART 2: ONE-TIME PAIRING CODE GENERATOR                   */}
      {/* ========================================================= */}
      <div
        ref={pairingSectionRef}
        className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
              Account Connection
            </span>
            <h2 className="text-base font-bold text-slate-900">
              One-Time Connection Code
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as <strong className="text-slate-800">{studentName}</strong> ({userEmail})
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-xs"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                {pairingCode ? "Generate New Code" : "Generate Connection Code"}
              </>
            )}
          </button>
        </div>

        {/* Pairing Code Display */}
        {pairingCode ? (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center space-y-4 animate-in fade-in">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Your One-Time Pairing Code
            </span>

            <div className="flex items-center justify-center gap-3">
              <div className="px-6 py-3.5 bg-white border-2 border-blue-500 rounded-xl font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-wider shadow-xs select-all">
                {pairingCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy code"
                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 font-medium">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>
                Expires in <strong>{formatTimer(timeLeft)}</strong> (Single-use only)
              </span>
            </div>

            {copied && (
              <p className="text-xs font-semibold text-emerald-600 animate-in fade-in">
                ✓ Code copied to clipboard!
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
            <KeyRound className="w-8 h-8 text-slate-400 mx-auto mb-1" />
            <p className="text-sm font-semibold text-slate-700">No active connection code</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click &quot;Generate Connection Code&quot; above to create a secure, 5-minute pairing code for your Chrome extension.
            </p>
          </div>
        )}

        {/* 3 Steps */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Quick Pairing Steps:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center mb-2">
                1
              </span>
              <p className="font-semibold text-slate-900">Open Extension</p>
              <p className="text-slate-500">
                Click the Smart Education Assistant icon in your Chrome toolbar.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center mb-2">
                2
              </span>
              <p className="font-semibold text-slate-900">Enter Code</p>
              <p className="text-slate-500">
                Paste or type the 9-character code into &quot;Enter connection code&quot;.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center mb-2">
                3
              </span>
              <p className="font-semibold text-slate-900">Click Connect</p>
              <p className="text-slate-500">
                Your extension pairs instantly. Official portals remain your source of truth.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-3 bg-blue-50/70 border border-blue-200 text-blue-950 p-4 rounded-xl text-xs">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Privacy First Architecture</p>
            <p className="text-blue-800 text-[11px] mt-0.5">
              Connection codes are one-time use and hashed with SHA-256 before storage. The extension never receives passwords, service role keys, Aadhaar/PAN IDs, or raw documents.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PART 3: COLLAPSIBLE DEVELOPER INSTALLATION SECTION        */}
      {/* ========================================================= */}
      <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setDevGuideOpen(!devGuideOpen)}
          className="flex items-center justify-between w-full text-left font-semibold text-slate-800 text-xs sm:text-sm"
        >
          <span className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-slate-500" />
            Developer installation
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              devGuideOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {devGuideOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in text-xs text-slate-600">
            <p className="text-slate-600">
              For local development testing without the Chrome Web Store:
            </p>

            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>
                Open Chrome Extensions (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">chrome://extensions</code>)
                <button
                  type="button"
                  onClick={handleCopyExtensionsUrl}
                  className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  {copiedExtensionsUrl ? "✓ Copied" : "Copy URL"}
                </button>
              </li>
              <li>Enable <strong>Developer Mode</strong> in the top-right corner.</li>
              <li>Click <strong>Load unpacked</strong> in the top-left toolbar.</li>
              <li>Select the project&apos;s <strong>extension</strong> folder.</li>
              <li>Return here and click <strong>Check Installation</strong>.</li>
            </ol>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-[11px]">
              💡 <strong>Note:</strong> If you update the extension code or manifest, click <strong>Reload</strong> on the extension card in <code className="font-mono">chrome://extensions</code>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
