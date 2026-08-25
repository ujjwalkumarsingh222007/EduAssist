"use client";

import { useState } from "react";
import { Puzzle, ExternalLink } from "lucide-react";
import { InstallExtensionModal } from "./InstallExtensionModal";

interface InstallExtensionButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "white";
  children?: React.ReactNode;
  onInstalled?: () => void;
}

export function InstallExtensionButton({
  className = "",
  variant = "primary",
  children,
  onInstalled,
}: InstallExtensionButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const chromeWebStoreUrl = process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL;

  function handleClick() {
    if (chromeWebStoreUrl) {
      window.open(chromeWebStoreUrl, "_blank", "noopener,noreferrer");
    } else {
      setModalOpen(true);
    }
  }

  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer";

  let variantStyles = "bg-blue-600 text-white hover:bg-blue-700 py-2.5 px-4";
  if (variant === "secondary") {
    variantStyles = "bg-slate-100 text-slate-800 hover:bg-slate-200 py-2.5 px-4";
  } else if (variant === "outline") {
    variantStyles = "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-2.5 px-4";
  } else if (variant === "white") {
    variantStyles = "bg-white text-blue-600 hover:bg-blue-50 py-2.5 px-4.5";
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        <Puzzle className="w-4 h-4" />
        {children || "Install Chrome Extension"}
        {chromeWebStoreUrl && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
      </button>

      <InstallExtensionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInstalled={onInstalled}
      />
    </>
  );
}
