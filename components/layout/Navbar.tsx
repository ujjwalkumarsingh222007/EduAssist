import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-600">
          <GraduationCap className="w-6 h-6" />
          <span>EduAssist</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          <Link href="/#features" className="hover:text-blue-600 transition-colors">Features</Link>
          <Link href="/#how-it-works" className="hover:text-blue-600 transition-colors">How it works</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
