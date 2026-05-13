"use client";
import Link from "next/link";

interface Props {
  current: "services" | "about" | "gallery";
}

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services", id: "services" },
  { href: "/about", label: "About Us", id: "about" },
  { href: "/gallery", label: "Gallery", id: "gallery" },
];

export default function SiteNav({ current }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg z-40 px-2 sm:px-4 py-2 sm:py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-center space-x-4 sm:space-x-8 flex-wrap gap-y-1">
        {links.map(({ href, label, id }) => (
          <Link
            key={href}
            href={href}
            className={`font-semibold text-sm sm:text-base transition-colors ${
              id === current
                ? "text-blue-600 border-b-2 border-blue-600 pb-0.5"
                : "text-gray-700 hover:text-blue-600"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
