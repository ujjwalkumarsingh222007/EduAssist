import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { GraduationCap, FileText, Award, CheckCircle, Bot, Shield } from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    title: "Student Profile",
    description: "Create one comprehensive digital profile that powers all your academic applications.",
  },
  {
    icon: FileText,
    title: "Document Storage",
    description: "Securely upload and manage transcripts, certificates, and IDs in one place.",
  },
  {
    icon: Award,
    title: "Scholarship Finder",
    description: "Discover scholarships matched to your profile and academic background.",
  },
  {
    icon: CheckCircle,
    title: "Eligibility Checker",
    description: "Instantly check your eligibility for programs, grants, and opportunities.",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description: "Get personalized help with forms, essays, and academic tasks using AI.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is encrypted and only used to help you — never shared or sold.",
  },
];

const steps = [
  { step: "01", title: "Create your profile", desc: "Enter your academic history, achievements, and goals once." },
  { step: "02", title: "Upload documents", desc: "Add your transcripts, IDs, and certificates securely." },
  { step: "03", title: "Get matched", desc: "Our AI finds scholarships and programs you qualify for." },
  { step: "04", title: "Apply with ease", desc: "Auto-fill forms and get guided through every application." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block mb-4 text-xs font-semibold tracking-widest text-blue-600 uppercase bg-blue-100 px-3 py-1 rounded-full">
            Smart Education Assistant
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
            One profile.{" "}
            <span className="text-blue-600">Endless opportunities.</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto">
            Build your student profile once and let our AI help you find scholarships,
            check eligibility, and auto-fill academic forms — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              Get started free
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto border border-slate-200 text-slate-700 font-semibold px-8 py-3 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors text-center"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need</h2>
            <p className="text-slate-500">All the tools a student needs, in one intelligent platform.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="p-6 rounded-xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500">Get started in minutes. No paperwork, no complexity.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <span className="text-2xl font-black text-blue-100 shrink-0 w-12 leading-none pt-1">
                  {step}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to simplify your education journey?</h2>
          <p className="text-blue-100 mb-8">
            Join students who manage their academic life smarter with EduAssist.
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Create your free profile
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-sm text-slate-400">
        <p>© 2026 EduAssist. All rights reserved.</p>
      </footer>
    </div>
  );
}
