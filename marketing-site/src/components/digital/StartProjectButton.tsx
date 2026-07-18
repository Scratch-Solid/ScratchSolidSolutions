"use client";
import { useState } from "react";
import IntakeWizard from "./IntakeWizard";

export default function StartProjectButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-[#B08A5E] px-7 py-3.5 text-base font-semibold text-[#2E1F16] shadow-lg hover:bg-[#c39a6c] transition-colors"
      >
        Start a project
      </button>
      <IntakeWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
