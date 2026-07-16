import Link from "next/link";

/** Small clickable brand mark for standalone pages (auth, password reset, data
 * deletion) that intentionally skip the full SiteNav bar to keep their
 * centered-card layout uncluttered, but still need a way back to the site. */
export default function BrandHomeLink() {
  return (
    <div className="max-w-md mx-auto mb-4 flex justify-center">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#2E1F16] flex items-center justify-center text-[#B08A5E] font-semibold text-sm" style={{ fontFamily: "Georgia, serif" }}>
          S
        </div>
        <span className="font-semibold text-sm sm:text-base tracking-wide text-[#2E1F16]" style={{ fontFamily: "Georgia, serif" }}>
          SCRATCH SOLID
        </span>
      </Link>
    </div>
  );
}
