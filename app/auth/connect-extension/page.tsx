"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, ShieldCheck, CheckCircle2, Loader2, ArrowRight, ExternalLink } from "lucide-react";

function ConnectExtensionContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user) {
        // Not logged in -> redirect to login
        router.push("/auth/login?callbackUrl=/auth/connect-extension");
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || "");

      // Fetch student profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const studentName = profile?.full_name || (session.user.user_metadata?.name as string) || "Student";
      setUserName(studentName);

      // Perform handshake broadcast
      performHandshake(session.access_token, session.user.id, session.user.email || "", studentName, session.expires_at);
    } catch (err: unknown) {
      console.error("Session check error:", err);
      setErrorMessage("Could not verify student session. Please try logging in again.");
    } finally {
      setLoading(false);
    }
  }

  function performHandshake(
    token: string,
    id: string,
    email: string,
    name: string,
    expiresAt?: number
  ) {
    setAuthorizing(true);

    const payload = {
      type: "SMART_ASSISTANT_CONNECT_SUCCESS",
      token,
      user_id: id,
      email,
      full_name: name,
      expires_at: expiresAt,
      timestamp: Date.now(),
    };

    // 1. Dispatch window postMessage for content script
    window.postMessage(payload, window.location.origin);

    // 2. Dispatch custom DOM event
    window.dispatchEvent(
      new CustomEvent("smart-assistant-extension-connect", { detail: payload })
    );

    setTimeout(() => {
      setAuthorizing(false);
      setConnected(true);
    }, 800);
  }

  async function handleManualAuthorize() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      performHandshake(
        session.access_token,
        session.user.id,
        session.user.email || "",
        userName || "Student",
        session.expires_at
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Verifying student account...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold text-xl text-blue-600"
          >
            <GraduationCap className="w-7 h-7" />
            EduAssist
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">
            Connect Chrome Extension
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Smart Education Assistant Companion
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm p-3.5 rounded-xl">
              {errorMessage}
            </div>
          )}

          {connected ? (
            <div className="text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Extension Connected! ✓
                </h2>
                <p className="text-slate-600 text-xs mt-1">
                  Your student account (<strong className="text-slate-800">{userEmail}</strong>) is now securely linked to the Smart Education Assistant extension.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-1">
                <p className="font-semibold text-slate-800">Next Steps:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>Open the extension popup on any webpage.</li>
                  <li>Click <strong>Detect Form</strong> to inspect application fields.</li>
                  <li>You can close this authorization tab anytime.</li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs hover:bg-blue-700 transition-colors"
                >
                  Return to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => window.close()}
                  className="w-full text-xs text-slate-500 hover:text-slate-700 py-1.5"
                >
                  Close this tab
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Account summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Authenticated Student:</span>
                  <span className="font-semibold text-slate-900">{userName || "Student"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-800">{userEmail}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">User ID:</span>
                  <span className="font-mono text-[11px] text-slate-500">{userId.substring(0, 13)}...</span>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="flex items-start gap-3 bg-blue-50/70 border border-blue-200 text-blue-950 p-3.5 rounded-xl text-xs">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Security & Privacy First</p>
                  <p className="text-blue-800 text-[11px] mt-0.5">
                    No passwords, documents, or sensitive identity IDs (Aadhaar/PAN) are shared with the extension. Only a secure session token is linked.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualAuthorize}
                disabled={authorizing}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs sm:text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {authorizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Linking Extension...
                  </>
                ) : (
                  <>
                    Authorize Extension <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Official Portal Source of Truth • Strict Privacy Architecture
        </p>
      </div>
    </div>
  );
}

export default function ConnectExtensionPage() {
  return (
    <Suspense>
      <ConnectExtensionContent />
    </Suspense>
  );
}
