"use client";

import { useState } from "react";

export default function TestSimpleFormPage() {
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Simple Form Autofill Test</h1>
          <p className="text-xs text-slate-500 mt-1">
            Minimal controlled React form for testing direct DOM writing of <code>full_name</code> and <code>date_of_birth</code>.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
            <p className="text-sm font-bold text-emerald-800">Form Submitted!</p>
            <p className="text-xs text-emerald-700">Name: {fullName || "—"}</p>
            <p className="text-xs text-emerald-700">DOB: {dob || "—"}</p>
          </div>
        ) : (
          <form
            id="test-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Applicant Full Name
              </label>
              <input
                id="full-name"
                name="full_name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Applicant Full Name"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label htmlFor="dob" className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                id="dob"
                name="date_of_birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Submit Form
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
