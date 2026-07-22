import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import AIAssistant from "@/components/AIAssistant";

export const metadata = {
  title: "Transportation — Scratch Solid Solutions",
  description: "Personalised and corporate transport from Scratch Solid Solutions, launching soon.",
};

export default function TransportationPage() {
  const notifyLink = "https://wa.me/27696735947?text=" + encodeURIComponent("Hi, please notify me when Scratch Solid Transportation launches.");

  return (
    <div className="min-h-screen font-sans bg-white">
      <SiteNav current="transportation" />

      <section className="pt-28 sm:pt-36 pb-16 sm:pb-20 px-4 text-center" style={{ background: "#EAF3FB" }}>
        <span className="inline-block bg-[#1B4F91] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5 tracking-wide">
          Coming soon
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-[#123A6B] mb-4 max-w-2xl mx-auto" style={{ fontFamily: "Georgia, serif" }}>
          Personalised &amp; corporate transport, on the way.
        </h1>
        <p className="text-base sm:text-lg text-[#3B6B9E] max-w-xl mx-auto mb-8">
          The same standard you get from our cleaning team, now for getting where you need to be. Message us and we&rsquo;ll let you know the moment we launch.
        </p>
        <a
          href={notifyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-[#1B4F91] px-7 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-[#164a86] transition-colors"
        >
          Notify me on WhatsApp
        </a>
      </section>

      <section className="py-14 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-[#D9ECFB] bg-[#F3F9FE] p-6">
            <h2 className="text-lg font-semibold text-[#123A6B] mb-2">Personal transport</h2>
            <p className="text-sm text-[#4A7BAA] leading-relaxed">
              Airport runs, appointments, everyday trips &mdash; booked the same trusted way you already book a clean.
            </p>
          </div>
          <div className="rounded-xl border border-[#D9ECFB] bg-[#F3F9FE] p-6">
            <h2 className="text-lg font-semibold text-[#123A6B] mb-2">Corporate transport</h2>
            <p className="text-sm text-[#4A7BAA] leading-relaxed">
              Staff shuttling and executive transport, billed on account like your cleaning contract.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
      <AIAssistant context="transportation" />
    </div>
  );
}
