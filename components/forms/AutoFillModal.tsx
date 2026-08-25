"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  User,
  GraduationCap,
  MapPin,
  Users,
  CreditCard,
  Lock,
  ArrowRight,
} from "lucide-react";
import { AutoFillSession, FieldMappingResult } from "@/lib/forms/types";

interface AutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AutoFillSession | null;
}

export default function AutoFillModal({ isOpen, onClose, session }: AutoFillModalProps) {
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  if (!isOpen || !session) return null;

  function toggleSensitive(fieldId: string) {
    setShowSensitive((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  }

  function handleValueChange(fieldId: string, val: string) {
    setEditedValues((prev) => ({ ...prev, [fieldId]: val }));
  }

  function handleCopyAllValues() {
    const lines = session!.mappings
      .filter((m) => m.status === "filled")
      .map((m) => `${m.field_label}: ${editedValues[m.field_id] ?? m.filled_value}`);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case "personal":
        return <User className="w-3.5 h-3.5 text-blue-600" />;
      case "family":
        return <Users className="w-3.5 h-3.5 text-purple-600" />;
      case "identity":
        return <Shield className="w-3.5 h-3.5 text-indigo-600" />;
      case "education":
        return <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />;
      case "financial":
        return <CreditCard className="w-3.5 h-3.5 text-teal-600" />;
      case "address":
        return <MapPin className="w-3.5 h-3.5 text-rose-600" />;
      case "security_challenge":
        return <Lock className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-500" />;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Form Auto-Fill Assistant
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verified Data Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                Application: <strong className="text-slate-800">{session.scholarship_title}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-emerald-800 font-medium">Fields Auto-Filled</p>
                <p className="text-lg font-extrabold text-emerald-900">{session.fields_filled_count}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-amber-800 font-medium">Requires Manual Input</p>
                <p className="text-lg font-extrabold text-amber-900">{session.fields_requiring_input_count}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-purple-800 font-medium">Security Challenges</p>
                <p className="text-lg font-extrabold text-purple-900">{session.security_challenges_count} (Manual)</p>
              </div>
            </div>
          </div>

          {/* Mandatory Safety Notice Banner */}
          <div className="bg-blue-50/80 border border-blue-200 text-blue-900 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Automated Mapping Complete &mdash; Student Review Required</p>
              <p className="text-blue-800 text-xs mt-0.5">
                Your form has been filled using your verified profile information. Please review every field, complete CAPTCHA/OTP if required, and submit the application yourself on the official website.
              </p>
            </div>
          </div>

          {/* Fields Review Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Application Form Fields ({session.mappings.length})
              </h3>
              <button
                onClick={handleCopyAllValues}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied to Clipboard!" : "Copy All Filled Values"}
              </button>
            </div>

            <div className="space-y-3">
              {session.mappings.map((field) => {
                const isSens = field.is_sensitive;
                const isShowing = showSensitive[field.field_id];
                const currentVal = editedValues[field.field_id] ?? field.filled_value ?? "";

                return (
                  <div
                    key={field.field_id}
                    className={`p-4 rounded-xl border transition-colors ${
                      field.status === "filled"
                        ? "bg-white border-slate-200 hover:border-blue-300 shadow-2xs"
                        : field.status === "manual_security_challenge"
                        ? "bg-purple-50/40 border-purple-200"
                        : "bg-amber-50/30 border-amber-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getCategoryIcon(field.category)}
                        <span className="text-xs font-bold text-slate-800 truncate" title={field.field_label}>
                          {field.field_label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {field.status === "filled" && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Auto-Filled
                          </span>
                        )}
                        {field.status === "needs_user_input" && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Needs User Input
                          </span>
                        )}
                        {field.status === "manual_security_challenge" && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Manual CAPTCHA / OTP
                          </span>
                        )}

                        {isSens && (
                          <button
                            type="button"
                            onClick={() => toggleSensitive(field.field_id)}
                            className="text-slate-400 hover:text-slate-700 p-1"
                            title={isShowing ? "Hide" : "Show"}
                          >
                            {isShowing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Field Value Input */}
                    {field.status === "manual_security_challenge" ? (
                      <div className="p-2.5 bg-white rounded-lg border border-purple-200 text-xs text-purple-900 font-medium flex items-center gap-2">
                        <Lock className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Security Challenge: Enter CAPTCHA/OTP directly on the official application page.</span>
                      </div>
                    ) : (
                      <input
                        type={isSens && !isShowing ? "password" : "text"}
                        value={currentVal}
                        onChange={(e) => handleValueChange(field.field_id, e.target.value)}
                        placeholder={field.status === "needs_user_input" ? "Enter value manually on application..." : ""}
                        className={`w-full px-3 py-2 rounded-lg text-xs sm:text-sm border outline-none transition-colors ${
                          field.status === "filled"
                            ? "bg-white text-slate-900 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            : "bg-amber-50/50 text-amber-900 border-amber-200 placeholder:text-amber-500/60 focus:bg-white focus:border-amber-400"
                        }`}
                      />
                    )}

                    {/* Notes */}
                    {field.notes && (
                      <p className="text-[11px] text-slate-400 mt-1.5">{field.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors order-2 sm:order-1"
          >
            Return to Dashboard
          </button>

          <a
            href={session.official_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm order-1 sm:order-2"
          >
            <span>Continue to Official Application</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
