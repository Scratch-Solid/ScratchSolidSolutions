"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Routes that render their own SiteFooter and don't need this one.
const ROUTES_WITH_OWN_FOOTER = ["/", "/digital", "/transportation"];

export default function GlobalFooter() {
  const pathname = usePathname();

  if (ROUTES_WITH_OWN_FOOTER.includes(pathname)) {
    return null;
  }

  return (
    <footer className="w-full py-4 text-center text-white/70 text-sm bg-black/20 backdrop-blur-sm">
      <div>© {new Date().getFullYear()} Scratch Solid Solutions. All rights reserved.</div>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs sm:text-sm text-white/80">
        <Link href="https://portal.scratchsolidsolutions.org/auth/login" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
          Career
        </Link>
        <Link href="/terms" className="hover:text-white transition-colors">
          Legal
        </Link>
        <Link href="/contact" className="hover:text-white transition-colors">
          Other enquiries
        </Link>
      </div>
    </footer>
  );
}
