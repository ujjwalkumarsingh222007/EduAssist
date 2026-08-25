"use client";

import { useState } from "react";
import { Award, CheckCircle2, ShieldAlert, FileText, Lock } from "lucide-react";

export default function TestScholarshipFormPage() {
  const [submitted, setSubmitted] = useState(false);

  // Controlled React form state to verify event dispatching & DOM syncing
  const [formData, setFormData] = useState({
    applicant_name: "",
    dob: "",
    father_name: "",
    class_10_pct: "",
    class_12_pct: "",
    class_12_year: "",
    class_12_board: "",
    nationality: "",
    category: "",
    annual_income: "",
    domicile: "",
    university: "",
    course: "",
    eligibility_declaration: false,
    captcha: "",
    otp: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="border-b border-slate-200 pb-5 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                National Merit Scholarship Portal (Step 6D & Step 7 Test Portal)
              </h1>
              <p className="text-xs text-slate-500">
                Ministry of Higher Education & National Scholarship Board 2026 • React Controlled Form
              </p>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900">Application Submitted Successfully</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your application has been received with verified profile details.
            </p>
          </div>
        ) : (
          <form id="scholarship_application_form" onSubmit={handleSubmit} className="space-y-6">
            {/* ========================================================= */}
            {/* 1. CANDIDATE PERSONAL INFORMATION */}
            {/* ========================================================= */}
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                1. Candidate Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Applicant Full Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="txt_applicant_name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Applicant Full Name *
                  </label>
                  <input
                    id="txt_applicant_name"
                    name="applicant_name"
                    type="text"
                    required
                    value={formData.applicant_name}
                    onChange={handleChange}
                    placeholder="Enter complete applicant full name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 2. Date of Birth */}
                <div>
                  <label htmlFor="txt_dob" className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    id="txt_dob"
                    name="dob"
                    type="date"
                    required
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 3. Father's Name */}
                <div>
                  <label htmlFor="txt_father" className="block text-xs font-semibold text-slate-700 mb-1">
                    Father&apos;s Name *
                  </label>
                  <input
                    id="txt_father"
                    name="father_name"
                    type="text"
                    required
                    value={formData.father_name}
                    onChange={handleChange}
                    placeholder="Enter father's full name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 8. Nationality */}
                <div>
                  <label htmlFor="txt_nationality" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nationality *
                  </label>
                  <input
                    id="txt_nationality"
                    name="nationality"
                    type="text"
                    required
                    value={formData.nationality}
                    onChange={handleChange}
                    placeholder="e.g. Indian"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 11. State of Domicile */}
                <div>
                  <label htmlFor="txt_domicile" className="block text-xs font-semibold text-slate-700 mb-1">
                    State of Domicile *
                  </label>
                  <input
                    id="txt_domicile"
                    name="domicile"
                    type="text"
                    required
                    value={formData.domicile}
                    onChange={handleChange}
                    placeholder="e.g. Delhi / Uttar Pradesh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 2. ACADEMIC QUALIFICATIONS */}
            {/* ========================================================= */}
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                2. Academic Qualifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 4. 10th Percentage */}
                <div>
                  <label htmlFor="txt_class_10_pct" className="block text-xs font-semibold text-slate-700 mb-1">
                    10th Percentage *
                  </label>
                  <input
                    id="txt_class_10_pct"
                    name="class_10_pct"
                    type="text"
                    required
                    value={formData.class_10_pct}
                    onChange={handleChange}
                    placeholder="e.g. 92.4%"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 5. 12th Standard Percentage */}
                <div>
                  <label htmlFor="txt_class_12_pct" className="block text-xs font-semibold text-slate-700 mb-1">
                    12th Standard Percentage *
                  </label>
                  <input
                    id="txt_class_12_pct"
                    name="class_12_pct"
                    type="text"
                    required
                    value={formData.class_12_pct}
                    onChange={handleChange}
                    placeholder="e.g. 94.6%"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 6. 12th Passing Year */}
                <div>
                  <label htmlFor="txt_class_12_year" className="block text-xs font-semibold text-slate-700 mb-1">
                    12th Passing Year *
                  </label>
                  <input
                    id="txt_class_12_year"
                    name="class_12_year"
                    type="text"
                    required
                    value={formData.class_12_year}
                    onChange={handleChange}
                    placeholder="e.g. 2024"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 7. 12th Board */}
                <div>
                  <label htmlFor="txt_class_12_board" className="block text-xs font-semibold text-slate-700 mb-1">
                    12th Board *
                  </label>
                  <input
                    id="txt_class_12_board"
                    name="class_12_board"
                    type="text"
                    required
                    value={formData.class_12_board}
                    onChange={handleChange}
                    placeholder="e.g. CBSE / ICSE"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 12. University */}
                <div>
                  <label htmlFor="txt_university" className="block text-xs font-semibold text-slate-700 mb-1">
                    University / Institution *
                  </label>
                  <input
                    id="txt_university"
                    name="university"
                    type="text"
                    required
                    value={formData.university}
                    onChange={handleChange}
                    placeholder="Enter enrolled university"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* 13. Course */}
                <div>
                  <label htmlFor="txt_course" className="block text-xs font-semibold text-slate-700 mb-1">
                    Course / Degree Program *
                  </label>
                  <input
                    id="txt_course"
                    name="course"
                    type="text"
                    required
                    value={formData.course}
                    onChange={handleChange}
                    placeholder="e.g. Bachelor of Technology"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 3. CATEGORY & FINANCIAL ELIGIBILITY */}
            {/* ========================================================= */}
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                3. Category & Financial Eligibility
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 9. Category Dropdown */}
                <div>
                  <label htmlFor="sel_category" className="block text-xs font-semibold text-slate-700 mb-1">
                    Social Category *
                  </label>
                  <select
                    id="sel_category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white transition-all"
                  >
                    <option value="">-- Select Category --</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>

                {/* 10. Annual Family Income */}
                <div>
                  <label htmlFor="txt_annual_income" className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Family Income (INR) *
                  </label>
                  <input
                    id="txt_annual_income"
                    name="annual_income"
                    type="number"
                    required
                    value={formData.annual_income}
                    onChange={handleChange}
                    placeholder="e.g. 250000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 4. ELIGIBILITY DECLARATION & SECURITY VERIFICATION */}
            {/* ========================================================= */}
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
                4. Declaration & Security Verification
              </h2>

              {/* 14. Long Eligibility Declaration Checkbox */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="chk_eligibility_declaration"
                    type="checkbox"
                    name="eligibility_declaration"
                    required
                    checked={formData.eligibility_declaration}
                    onChange={handleChange}
                    className="mt-0.5 accent-blue-600 rounded"
                  />
                  <span className="text-xs text-amber-950 leading-relaxed font-medium">
                    I confirm that I am an Indian citizen residing in India, have passed Class 12 (HSC or equivalent) with required marks, and agree to all scholarship guidelines.
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 15. Security CAPTCHA */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      Security CAPTCHA *
                    </span>
                    <span className="px-2.5 py-1 bg-slate-200 text-slate-800 font-mono font-bold text-xs rounded tracking-widest select-none">
                      7K9X2
                    </span>
                  </div>
                  <input
                    id="txt_captcha_code"
                    name="captcha"
                    type="text"
                    required
                    value={formData.captcha}
                    onChange={handleChange}
                    placeholder="Enter characters shown above"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                {/* 16. OTP Verification */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                      One-Time Password (OTP) *
                    </span>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Send OTP
                    </button>
                  </div>
                  <input
                    id="txt_otp_verification"
                    name="otp"
                    type="text"
                    required
                    value={formData.otp}
                    onChange={handleChange}
                    placeholder="Enter 6-digit verification code"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Submit Application Form
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
