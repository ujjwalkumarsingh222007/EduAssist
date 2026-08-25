"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Search, Loader2, Link2, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function FormUrlAnalyzer() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [stepMessage, setStepMessage] = useState("");

  async function handleAnalyze(targetUrlToUse?: string) {
    const targetUrl = targetUrlToUse || url;
    if (!targetUrl.trim()) {
      setErrorMessage("Please enter an official application URL to analyze.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setStepMessage("Fetching and analyzing application page structure...");

      const timer = setTimeout(() => {
        setStepMessage("Generating internal form schema and pre-filling verified profile data...");
      }, 900);

      const res = await fetch("/api/forms/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: targetUrl.trim() }),
      });

      clearTimeout(timer);
      const data = await res.json();

      if (!res.ok || !data.success || !data.application) {
        throw new Error(data.error || "Failed to analyze application URL.");
      }

      // Store in sessionStorage for fast client navigation fallback if DB is in local mode
      sessionStorage.setItem(`form_${data.application.id}`, JSON.stringify(data.application));

      // Navigate to internal dynamic form page
      router.push(`/dashboard/forms/${data.application.id}`);
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred while analyzing the application form.");
    } finally {
      setLoading(false);
      setStepMessage("");
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div>
        <label htmlFor="input_app_url" className="block text-sm font-bold text-slate-900 mb-1">
          Paste the Official Application URL
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Enter any scholarship, admission, or government application link to generate a pre-filled internal form.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Link2 className="w-4 h-4" />
            </div>
            <input
              id="input_app_url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://scholarships.gov.in/application-form"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-70 transition-all text-xs sm:text-sm shadow-xs shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Form...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                Analyze Application
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Step Notice */}
      {loading && (
        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-3 text-xs text-blue-900 animate-in fade-in">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
          <span>{stepMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-900">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Analysis Failed</p>
            <p className="text-red-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Quick Try Option */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <span>Want to test the dynamic generator right away?</span>
        <button
          type="button"
          onClick={() => {
            setUrl("http://localhost:3000/test-scholarship-form");
            handleAnalyze("http://localhost:3000/test-scholarship-form");
          }}
          disabled={loading}
          className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline shrink-0"
        >
          <span>Try National Merit Test Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
