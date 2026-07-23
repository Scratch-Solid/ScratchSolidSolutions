"use client";
import { useEffect, useState } from "react";

type Slide = { src: string; alt: string };

type CaseStudy = {
  kicker: string;
  title: string;
  copy: string;
  stats: { value: string; label: string }[];
  slides: Slide[];
  links: { label: string; href: string; primary?: boolean }[];
  reverse?: boolean;
};

const CASE_STUDIES: CaseStudy[] = [
  {
    kicker: "Marketing site + admin portal",
    title: "Warren Moore Mobile Car Wash & Detailing",
    copy: "A premium mobile detailing brand — corporate fleets, private aircraft — needed a site that read as luxury, not a template. We built a dark, editorial marketing site plus a Cloudflare-backed admin portal so the owner manages services, bookings, gallery and reviews without touching code.",
    stats: [
      { value: "Live", label: "In production" },
      { value: "Self-service", label: "Admin portal" },
    ],
    slides: [
      { src: "/showcase/warren-01-hero.webp", alt: "Warren Moore Mobile Car Wash & Detailing homepage hero" },
      { src: "/showcase/warren-02-services.webp", alt: "Warren Moore services and pricing page" },
      { src: "/showcase/warren-03-portal-login.webp", alt: "Warren Moore admin portal secure login" },
    ],
    links: [
      { label: "Visit live site", href: "https://warrenmooremobilecarwashdetailing.org", primary: true },
      { label: "View admin portal", href: "https://portal.warrenmooremobilecarwashdetailing.org" },
    ],
  },
  {
    kicker: "Full company platform — our own",
    title: "Scratch Solid Solutions",
    copy: "This is the platform running our own company — the site you're on, and the full staff system behind it: bookings, live cleaner GPS check-ins, an onboarding pipeline with e-signed contracts, a 7-module training system, payroll and admin. If you're reading this, you're already inside the proof.",
    stats: [
      { value: "3", label: "Departments run on it" },
      { value: "Daily", label: "Active staff use" },
    ],
    slides: [
      { src: "/showcase/scratch-01-home.webp", alt: "Scratch Solid Solutions homepage" },
      { src: "/showcase/scratch-02-services.webp", alt: "Scratch Solid Solutions cleaning services page" },
      { src: "/showcase/scratch-03-portal-login.webp", alt: "Scratch Solid Solutions internal staff portal login" },
    ],
    links: [
      { label: "Visit live site", href: "https://scratchsolidsolutions.org", primary: true },
      { label: "Peek at the staff portal", href: "https://portal.scratchsolidsolutions.org" },
    ],
    reverse: true,
  },
  {
    kicker: "Security operations dashboard",
    title: "Cybersecurity Ticket & Incident Command Centre",
    copy: "A security operations team needed one place for incident tickets, system health and audit visibility, with access scoped by role. We built a role-based ticket dashboard covering login, recovery and account-creation end to end — replacing scattered spreadsheets and inboxes.",
    stats: [
      { value: "Role-based", label: "Access control" },
      { value: "Live", label: "Ticket queues" },
    ],
    slides: [
      { src: "/showcase/ticket-01-login.webp", alt: "Cybersecurity Command Centre login screen, desktop" },
      { src: "/showcase/ticket-02-login-mobile.webp", alt: "Cybersecurity Command Centre login screen, mobile" },
    ],
    links: [
      { label: "View the dashboard", href: "https://main.ticket-system-frontend-f77.pages.dev", primary: true },
    ],
  },
];

function Slideshow({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <div className="rounded-xl overflow-hidden border border-[#E9E0D3] shadow-lg relative bg-[#F7F2EA]">
      <div className="bg-[#e9e5df] px-3 py-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#d3cec5]" />
        <span className="w-2 h-2 rounded-full bg-[#d3cec5]" />
        <span className="w-2 h-2 rounded-full bg-[#d3cec5]" />
      </div>
      <div className="relative aspect-[16/10]">
        {slides.map((slide, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0 }}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? "18px" : "6px",
                background: i === index ? "#B08A5E" : "rgba(255,255,255,0.7)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CaseStudyRow({ study }: { study: CaseStudy }) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center ${
        study.reverse ? "md:[direction:rtl]" : ""
      }`}
    >
      <div className={study.reverse ? "md:[direction:ltr]" : ""}>
        <Slideshow slides={study.slides} />
      </div>
      <div className={study.reverse ? "md:[direction:ltr]" : ""}>
        <p className="text-xs uppercase tracking-[0.1em] text-[#8a6a45] font-semibold mb-2.5">
          {study.kicker}
        </p>
        <h3 className="text-xl sm:text-2xl text-[#2E1F16] mb-3" style={{ fontFamily: "Georgia, serif" }}>
          {study.title}
        </h3>
        <p className="text-sm text-stone-600 leading-relaxed mb-4">{study.copy}</p>
        <div className="flex gap-2 flex-wrap mb-5">
          {study.stats.map((stat) => (
            <div key={stat.label} className="bg-white border border-[#E9E0D3] rounded-lg px-3 py-2">
              <div className="text-sm font-bold text-[#2E1F16]">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-stone-500">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2.5 flex-wrap">
          {study.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                link.primary
                  ? "text-sm font-semibold px-4 py-2.5 rounded-lg bg-[#2E1F16] text-[#F7F2EA] hover:bg-[#3a281a] transition-colors"
                  : "text-sm font-semibold px-4 py-2.5 rounded-lg border border-[#E9E0D3] text-[#2E1F16] hover:bg-[#F7F2EA] transition-colors"
              }
            >
              {link.label} &#8599;
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CaseStudyShowcase() {
  return (
    <section className="py-16 sm:py-20 px-4 bg-[#FAF7F2]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#B08A5E] font-semibold mb-4">
            Live in production
          </p>
          <h2 className="text-2xl sm:text-3xl text-[#2E1F16] mb-3" style={{ fontFamily: "Georgia, serif" }}>
            Three businesses running on what we built
          </h2>
          <p className="text-sm sm:text-base text-stone-600 max-w-xl mx-auto">
            Not mockups, not templates &mdash; real, live products handed over and in daily use.
          </p>
        </div>
        <div className="flex flex-col gap-16 sm:gap-20">
          {CASE_STUDIES.map((study) => (
            <CaseStudyRow key={study.title} study={study} />
          ))}
        </div>
      </div>
    </section>
  );
}
