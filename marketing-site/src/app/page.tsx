"use client";

import Link from "next/link";
import AIAssistant from "@/components/AIAssistant";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  const handleBookCleaner = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      window.location.href = "/client-dashboard";
    } else {
      window.location.href = "/auth?redirect=/client-dashboard";
    }
  };

  return (
    <div className="min-h-screen font-sans relative bg-white">
      <SiteNav current="services" />

      {/* Hero */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-20 px-4" style={{ background: "linear-gradient(180deg, #2E1F16, #3a281a)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#B08A5E] font-semibold mb-4">
            Cleaning &middot; Transportation &middot; Digital
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-normal text-[#F7F2EA] mb-5 sm:mb-6 tracking-tight leading-tight" style={{ fontFamily: "Georgia, serif" }}>
            Everything you need, under one roof.
          </h1>
          <p className="text-lg sm:text-xl text-[#CBB89A] mb-8 sm:mb-10 max-w-2xl mx-auto">
            One trusted name for cleaning, corporate transport and the software that runs it all &mdash; with full transparency, every time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={handleBookCleaner}
              className="rounded-lg bg-[#B08A5E] px-7 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-[#2E1F16] shadow-xl hover:bg-[#c39a6c] active:scale-95 transition-all duration-200"
            >
              Book a clean
            </button>
            <Link
              href="/services"
              className="rounded-lg bg-white/10 border border-white/25 px-7 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-[#F7F2EA] hover:bg-white/15 active:scale-95 transition-all duration-200"
            >
              Explore services
            </Link>
          </div>
        </div>
      </section>

      {/* Division cards */}
      <section className="py-14 sm:py-16 px-4 -mt-1">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-[#E9E0D3] bg-[#F7F2EA]/60 p-6 sm:p-7">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#B08A5E] font-semibold mb-2">Est. &mdash; the original</p>
            <h2 className="text-lg font-semibold text-[#2E1F16] mb-2">Cleaning</h2>
            <p className="text-sm text-stone-600 mb-4 leading-relaxed">
              Residential and commercial cleaning, tracked live from &ldquo;On the way&rdquo; to &ldquo;Completed&rdquo;, every status timestamped.
            </p>
            <Link href="/services" className="text-sm font-medium text-[#2E1F16] underline underline-offset-2">View services &rarr;</Link>
          </div>

          <div className="rounded-2xl border border-dashed border-[#D3C6AE] bg-[#F3ECE1]/70 p-6 sm:p-7 relative">
            <span className="absolute top-5 right-5 bg-[#F0E6D6] text-[#8a6a3a] text-[10px] font-semibold px-2.5 py-1 rounded-full">Coming soon</span>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#a3906f] font-semibold mb-2 mt-1">Personal &amp; corporate</p>
            <h2 className="text-lg font-semibold text-stone-600 mb-2">Transportation</h2>
            <p className="text-sm text-stone-500 mb-4 leading-relaxed">
              Launching soon &mdash; the same standard you get from our cleaning team, now for getting where you need to be.
            </p>
            <Link href="/transportation" className="text-sm font-medium text-stone-600 underline underline-offset-2">Notify me &rarr;</Link>
          </div>

          <div className="rounded-2xl border border-[#E9E0D3] bg-[#F7F2EA]/60 p-6 sm:p-7">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#B08A5E] font-semibold mb-2">Scratch Solid Digital</p>
            <h2 className="text-lg font-semibold text-[#2E1F16] mb-2">Web &amp; app development</h2>
            <p className="text-sm text-stone-600 mb-4 leading-relaxed">
              Custom websites, apps and booking systems, built and run by our own in-house team &mdash; including the tracker above.
            </p>
            <Link href="/digital" className="text-sm font-medium text-[#2E1F16] underline underline-offset-2">See our work &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Transparency Policy */}
      <section className="py-14 sm:py-16 px-4 bg-[#F7F2EA]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal text-[#2E1F16] mb-3 text-center" style={{ fontFamily: "Georgia, serif" }}>
            Cleaning with nothing to hide
          </h2>
          <p className="text-base sm:text-lg text-stone-600 mb-10 text-center max-w-2xl mx-auto">
            In an industry where trust is everything, we lead with transparency. Our own platform keeps you in the loop from start to finish.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-[#E9E0D3]">
              <h3 className="font-semibold text-[#2E1F16] mb-2 text-base">Real-time tracking</h3>
              <p className="text-sm text-stone-600">Watch your cleaner's status live &mdash; On the way, Arrived, Completed &mdash; each one timestamped.</p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-[#E9E0D3]">
              <h3 className="font-semibold text-[#2E1F16] mb-2 text-base">Guaranteed time on site</h3>
              <p className="text-sm text-stone-600">Our Standard Clean includes 3 hours of active cleaning in a 4-hour window. No rushed jobs, ever.</p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-[#E9E0D3]">
              <h3 className="font-semibold text-[#2E1F16] mb-2 text-base">Secure, trusted &amp; compliant</h3>
              <p className="text-sm text-stone-600">POPIA compliant, B-BBEE Level 1, and secured by Cloudflare &mdash; your data and your home are in safe hands.</p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-[#E9E0D3]">
              <h3 className="font-semibold text-[#2E1F16] mb-2 text-base">The signature finish</h3>
              <p className="text-sm text-stone-600">Every space is hand-checked and treated with our signature Fresh Lemon spray.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Areas We Service */}
      <section className="py-14 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal text-[#2E1F16] mb-3" style={{ fontFamily: "Georgia, serif" }}>
            Areas we service
          </h2>
          <p className="text-base sm:text-lg text-stone-600 mb-6">
            Your local Northern Suburbs partner
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {["Parow", "Plattekloof", "Durbanville", "Tygervalley", "Bellville", "Kuilsriver", "Brackenfell"].map((area) => (
              <span key={area} className="bg-[#F7F2EA] px-3.5 sm:px-4 py-2 rounded-full text-sm text-[#2E1F16] border border-[#E9E0D3]">
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + partners */}
      <section className="py-14 sm:py-16 px-4" style={{ background: "linear-gradient(135deg, #2E1F16, #3a281a)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-normal mb-4 text-[#F7F2EA]" style={{ fontFamily: "Georgia, serif" }}>
            Ready to see the difference transparency makes?
          </h2>
          <p className="text-base sm:text-lg mb-8 text-[#CBB89A]">
            Get your quick quote via WhatsApp today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center text-sm text-[#CBB89A]">
            <a href="https://wa.me/27696735947" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#F7F2EA] transition-colors">
              <span className="font-semibold text-[#F7F2EA]">WhatsApp:</span> +27 69 673 5947
            </a>
            <a href="mailto:customerservice@scratchsolidsolutions.org" className="flex items-center gap-2 hover:text-[#F7F2EA] transition-colors">
              <span className="font-semibold text-[#F7F2EA]">Email:</span> customerservice@scratchsolidsolutions.org
            </a>
            <a href="https://instagram.com/ScratchSolidSolutions" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#F7F2EA] transition-colors">
              <span className="font-semibold text-[#F7F2EA]">Social:</span> @ScratchSolidSolutions
            </a>
          </div>
          <div className="mt-10">
            <p className="text-xs text-[#a89880] mb-4">Proudly partnered with trusted platforms to deliver verified cleaning services.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <a href="https://www.bark.com" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white/95 p-5 shadow-lg border border-white/20 hover:bg-white transition-all">
                <p className="text-xs uppercase tracking-[0.2em] text-[#B08A5E] font-semibold mb-2">In partnership with</p>
                <p className="text-xl font-semibold text-[#2E1F16]">Bark.com</p>
              </a>
              <a href="https://www.procompare.co.za" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white/95 p-5 shadow-lg border border-white/20 hover:bg-white transition-all">
                <p className="text-xs uppercase tracking-[0.2em] text-[#B08A5E] font-semibold mb-2">In partnership with</p>
                <p className="text-xl font-semibold text-[#2E1F16]">ProCompare</p>
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/27696735947"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center shadow-2xl border-2 border-white hover:bg-[#1ebd5a] transition-colors"
        aria-label="WhatsApp Booking"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" fill="white"><path d="M16 3C9.373 3 4 8.373 4 15c0 2.646.86 5.09 2.33 7.09L4 29l7.18-2.28C12.91 27.14 14.43 27.5 16 27.5c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.41 0-2.79-.23-4.09-.68l-.29-.1-4.18 1.33 1.36-4.07-.18-.28C6.23 18.01 6 16.52 6 15c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.07-7.75c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.41-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.66 1.12 2.85c.14.18 1.93 2.95 4.68 4.02.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.18-.53-.32z"/></svg>
      </a>

      <AIAssistant />
    </div>
  );
}
