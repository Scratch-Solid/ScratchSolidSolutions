"use client";
import Link from "next/link";

interface Props {
  current?: "services" | "about" | "gallery" | "transportation" | "digital" | "contact";
}

const links = [
  { href: "/services", label: "Cleaning", id: "services" as const },
  { href: "/transportation", label: "Transportation", id: "transportation" as const, soon: true },
  { href: "/digital", label: "Digital", id: "digital" as const },
  { href: "/gallery", label: "Gallery", id: "gallery" as const },
  { href: "/about", label: "About", id: "about" as const },
  { href: "/contact", label: "Contact", id: "contact" as const },
];

function handleBookNow() {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  window.location.href = token ? "/client-dashboard" : "/auth?redirect=/client-dashboard";
}

export default function SiteNav({ current }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg z-40 px-3 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#2E1F16] flex items-center justify-center text-[#B08A5E] font-semibold text-sm" style={{ fontFamily: "Georgia, serif" }}>
            S
          </div>
          <span className="font-semibold text-sm sm:text-base tracking-wide text-[#2E1F16] hidden sm:inline" style={{ fontFamily: "Georgia, serif" }}>
            SCRATCH SOLID
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-end">
          {links.map(({ href, label, id, soon }) => (
            <Link
              key={href}
              href={href}
              className={`font-semibold text-xs sm:text-sm transition-colors ${
                id === current
                  ? "text-[#B08A5E] border-b-2 border-[#B08A5E] pb-0.5"
                  : soon
                    ? "text-stone-400 hover:text-stone-500"
                    : "text-stone-700 hover:text-[#B08A5E]"
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={handleBookNow}
            className="rounded-lg bg-[#2E1F16] text-[#F7F2EA] px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-[#241811] transition-colors"
          >
            Book now
          </button>
        </div>
      </div>
    </nav>
  );
}
