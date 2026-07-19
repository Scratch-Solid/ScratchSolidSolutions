import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import StartProjectButton from "@/components/digital/StartProjectButton";

export const metadata = {
  title: "Scratch Solid Digital — Web & App Development",
  description: "Websites, apps and booking systems built by Scratch Solid Digital, the in-house software studio behind Scratch Solid Solutions.",
};

export default function DigitalPage() {
  return (
    <div className="min-h-screen font-sans bg-white">
      <SiteNav current="digital" />

      <section className="pt-28 sm:pt-36 pb-14 sm:pb-16 px-4" style={{ background: "linear-gradient(180deg, #2E1F16, #3a281a)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#B08A5E] font-semibold mb-4">
            Scratch Solid Digital
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-[#F7F2EA] mb-5" style={{ fontFamily: "Georgia, serif" }}>
            We built the system running our own business.
          </h1>
          <p className="text-base sm:text-lg text-[#CBB89A] mb-8 max-w-xl mx-auto">
            Websites, apps, and booking systems &mdash; designed and run in-house, for our own cleaning and transport operations first, and for other businesses too.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <StartProjectButton />
            <a
              href="https://wa.me/27696735947?text=Hi%2C%20I%27d%20like%20to%20discuss%20a%20web%2Fapp%20project."
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/10 border border-white/25 px-7 py-3.5 text-base font-semibold text-[#F7F2EA] hover:bg-white/15 transition-colors"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-xl border border-[#E9E0D3] bg-[#F7F2EA]/60 p-6 text-center">
            <h2 className="text-base font-semibold text-[#2E1F16] mb-2">Websites</h2>
            <p className="text-sm text-stone-600">Marketing sites and client-facing portals built for speed and clarity.</p>
          </div>
          <div className="rounded-xl border border-[#E9E0D3] bg-[#F7F2EA]/60 p-6 text-center">
            <h2 className="text-base font-semibold text-[#2E1F16] mb-2">Apps</h2>
            <p className="text-sm text-stone-600">Staff and client-facing tools, from onboarding flows to internal dashboards.</p>
          </div>
          <div className="rounded-xl border border-[#E9E0D3] bg-[#F7F2EA]/60 p-6 text-center">
            <h2 className="text-base font-semibold text-[#2E1F16] mb-2">Booking systems</h2>
            <p className="text-sm text-stone-600">End-to-end scheduling, assignment and live status tracking, built to your business.</p>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16 px-4 bg-[#2E1F16]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <div className="text-3xl">&#10003;</div>
          <div>
            <p className="text-[#B08A5E] text-xs uppercase tracking-[0.15em] font-semibold mb-2">Built in-house</p>
            <h2 className="text-lg font-semibold text-[#F7F2EA] mb-2">The live tracker on our cleaning page</h2>
            <p className="text-sm text-[#c9b89a] leading-relaxed">
              Real-time status, timestamped, running in production for every cleaning booking &mdash; that&rsquo;s one of our own projects, not a demo.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
