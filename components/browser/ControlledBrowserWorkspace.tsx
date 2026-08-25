"use client";

import { useState, useRef, useEffect } from "react";
import {
  Globe,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MousePointer,
  ExternalLink,
  ChevronRight,
  Eye,
  KeyRound,
  Send,
  PowerOff,
} from "lucide-react";
import { BrowserSessionState, FormFieldFillResult } from "@/lib/browser/types";

interface Props {
  initialUrl?: string;
}

export default function ControlledBrowserWorkspace({ initialUrl }: Props) {
  const [url, setUrl] = useState(initialUrl || "http://localhost:3000/test-scholarship-form");
  const [session, setSession] = useState<BrowserSessionState | null>(null);
  const [starting, setStarting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [interactivityLoading, setInteractivityLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [userTakingControl, setUserTakingControl] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);

  // Close session on component unmount
  useEffect(() => {
    return () => {
      if (session?.sessionId) {
        fetch("/api/browser/session/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.sessionId }),
        }).catch(() => {});
      }
    };
  }, [session?.sessionId]);

  // Start Browser Session
  async function handleStartSession(customUrl?: string) {
    const target = customUrl || url;
    if (!target.trim()) {
      setErrorMessage("Please enter an official application URL.");
      return;
    }

    try {
      setStarting(true);
      setErrorMessage("");
      setStatusMessage("Starting Playwright controlled browser session & connecting to official site...");

      const res = await fetch("/api/browser/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.session) {
        throw new Error(data.error || "Failed to start browser session.");
      }

      setSession(data.session);
      setStatusMessage(data.session.statusMessage || "Browser connected to official application portal.");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setStarting(false);
    }
  }

  // Trigger AI Form Analysis & Auto-fill on Live Browser Page
  async function handleAutoFill() {
    if (!session) return;

    try {
      setAnalyzing(true);
      setErrorMessage("");
      setStatusMessage("AI analyzing live DOM form controls & mapping to verified student profile...");

      const res = await fetch("/api/browser/session/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.summary) {
        throw new Error(data.error || "Failed to fill form fields.");
      }

      const summary = data.summary;
      setSession((prev) =>
        prev
          ? {
              ...prev,
              screenshotBase64: summary.screenshotBase64 || prev.screenshotBase64,
              detectedFieldsCount: summary.detected_fields_count,
              matchedFieldsCount: summary.matched_count,
              filledFieldsCount: summary.filled_fields_count,
              needsInputCount: summary.needs_input_count,
              securityChallengeDetected: summary.security_challenge_detected,
              mappings: summary.mappings || [],
              statusMessage: summary.status_message,
              status: "user_control",
            }
          : null
      );

      setStatusMessage(summary.status_message);
      setUserTakingControl(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Auto-fill failed");
    } finally {
      setAnalyzing(false);
    }
  }

  // Interactive Viewport Click
  async function handleViewportClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!session || interactivityLoading) return;

    const img = imageRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Viewport native resolution in Playwright is 1200 x 750
    const scaleX = 1200 / rect.width;
    const scaleY = 750 / rect.height;

    const nativeX = Math.round(clickX * scaleX);
    const nativeY = Math.round(clickY * scaleY);

    try {
      setInteractivityLoading(true);
      const res = await fetch("/api/browser/session/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          action: { type: "click", x: nativeX, y: nativeY },
        }),
      });

      const data = await res.json();
      if (data.success && data.screenshotBase64) {
        setSession((prev) => (prev ? { ...prev, screenshotBase64: data.screenshotBase64, url: data.url || prev.url } : null));
      }
    } catch (err) {
      console.error("Click interaction error:", err);
    } finally {
      setInteractivityLoading(false);
    }
  }

  // Interactive Type Text
  async function handleTypeText() {
    if (!session || !inputText || interactivityLoading) return;

    try {
      setInteractivityLoading(true);
      const res = await fetch("/api/browser/session/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          action: { type: "type", text: inputText },
        }),
      });

      const data = await res.json();
      if (data.success && data.screenshotBase64) {
        setSession((prev) => (prev ? { ...prev, screenshotBase64: data.screenshotBase64 } : null));
        setInputText("");
      }
    } catch (err) {
      console.error("Type text error:", err);
    } finally {
      setInteractivityLoading(false);
    }
  }

  // Interactive Scroll
  async function handleScroll(direction: "up" | "down") {
    if (!session || interactivityLoading) return;

    try {
      setInteractivityLoading(true);
      const deltaY = direction === "down" ? 400 : -400;
      const res = await fetch("/api/browser/session/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          action: { type: "scroll", deltaY },
        }),
      });

      const data = await res.json();
      if (data.success && data.screenshotBase64) {
        setSession((prev) => (prev ? { ...prev, screenshotBase64: data.screenshotBase64 } : null));
      }
    } catch (err) {
      console.error("Scroll error:", err);
    } finally {
      setInteractivityLoading(false);
    }
  }

  // End Session
  async function handleEndSession() {
    if (session?.sessionId) {
      await fetch("/api/browser/session/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      }).catch(() => {});
    }
    setSession(null);
    setStatusMessage("");
    setUserTakingControl(false);
  }

  return (
    <div className="space-y-6">
      {/* 1. Address Bar & Session Launcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Official Portal URL Address</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://scholarships.gov.in/application"
              disabled={!!session}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-500 outline-none disabled:opacity-70"
            />
          </div>

          {!session ? (
            <button
              type="button"
              onClick={() => handleStartSession()}
              disabled={starting}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-70 transition-all text-xs sm:text-sm shadow-xs shrink-0"
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <span>Open Browser Workspace</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={analyzing}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 transition-all text-xs shadow-xs"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Form...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Fill with Verified Profile
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleEndSession}
                className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs"
                title="Disconnect browser workspace"
              >
                <PowerOff className="w-3.5 h-3.5" />
                Close Session
              </button>
            </div>
          )}
        </div>

        {/* Quick Connect local preset */}
        {!session && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Test the browser workspace on our local official portal test replica:</span>
            <button
              type="button"
              onClick={() => {
                setUrl("http://localhost:3000/test-scholarship-form");
                handleStartSession("http://localhost:3000/test-scholarship-form");
              }}
              disabled={starting}
              className="text-blue-600 font-bold hover:underline"
            >
              Connect to Local Test Portal &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-3 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Live Controlled Browser Workspace Viewport */}
      {session && (
        <div className="space-y-4">
          {/* Live Status Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Official Portal Live Session</span>
                  <span className="text-[10px] text-slate-400 font-normal">({session.pageTitle})</span>
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">{statusMessage || session.statusMessage}</p>
              </div>
            </div>

            {session.securityChallengeDetected && (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 rounded-xl text-amber-200 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Security Checkpoint / CAPTCHA (Solve Manually Below)</span>
              </div>
            )}
          </div>

          {/* Viewport Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Viewport Toolbar */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <MousePointer className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-800">Interactive Controlled Browser</span>
                <span className="text-[11px] text-slate-400">Click anywhere on the form below to interact directly</span>
              </div>

              {/* Viewport Actions: Scroll & Type */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTypeText()}
                    placeholder="Type in focused field..."
                    className="px-2 py-0.5 text-xs outline-none w-36 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleTypeText}
                    disabled={!inputText || interactivityLoading}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Send keystrokes to browser"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleScroll("up")}
                  disabled={interactivityLoading}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                  title="Scroll Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleScroll("down")}
                  disabled={interactivityLoading}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                  title="Scroll Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Viewport Frame */}
            <div className="relative bg-slate-900 flex justify-center p-2 min-h-[400px]">
              {interactivityLoading && (
                <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}

              {session.screenshotBase64 ? (
                <img
                  ref={imageRef}
                  src={session.screenshotBase64}
                  alt="Live Official Application Portal"
                  onClick={handleViewportClick}
                  className="w-full max-w-5xl rounded-lg shadow-lg border border-slate-700 cursor-crosshair select-none"
                />
              ) : (
                <div className="py-24 text-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                  Streaming official application portal...
                </div>
              )}
            </div>
          </div>

          {/* 3. Field Automation & Safeguards Summary */}
          {session.mappings && session.mappings.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Live Form Auto-Fill Breakdown ({session.mappings.length} Detected Fields)
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {session.filledFieldsCount} Filled
                  </span>
                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    {session.needsInputCount} Needs Input
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {session.mappings.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs ${
                      m.status === "filled"
                        ? "bg-emerald-50/40 border-emerald-200"
                        : m.status === "security_challenge"
                        ? "bg-purple-50/50 border-purple-200"
                        : "bg-amber-50/40 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-slate-800 line-clamp-1">{m.field_label}</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          m.status === "filled"
                            ? "bg-emerald-100 text-emerald-800"
                            : m.status === "security_challenge"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {m.status === "filled"
                          ? "✓ Verified"
                          : m.status === "security_challenge"
                          ? "Manual Challenge"
                          : "Manual Input"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium">
                      {m.filled_value ? (
                        <>Value: <strong>{m.display_value || m.filled_value}</strong></>
                      ) : (
                        <span className="text-slate-400 italic">Left blank (Enter manually)</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Manual Submission Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Original Official Portal Remains Source of Truth</span>
            </div>
            <p>
              Supported fields have been populated using only your verified profile data. Antigravity will <strong>never auto-submit</strong> or bypass security challenges. Please solve the CAPTCHA code, complete any unverified fields in the interactive window above, review your entries, and manually click the official <strong>Submit Application</strong> button.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
