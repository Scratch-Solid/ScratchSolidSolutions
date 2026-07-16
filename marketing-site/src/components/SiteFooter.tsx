import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="bg-[#2E1F16] pt-10 pb-6 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 pb-8 border-b border-white/10">
          <div className="md:flex-[1.4]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-md bg-[#B08A5E] flex items-center justify-center text-[#2E1F16] font-semibold text-xs" style={{ fontFamily: "Georgia, serif" }}>
                S
              </div>
              <span className="text-[#F7F2EA] font-semibold text-sm" style={{ fontFamily: "Georgia, serif" }}>
                Scratch Solid Solutions
              </span>
            </div>
            <p className="text-[#a89880] text-sm leading-relaxed max-w-xs">
              Cleaning, transportation and digital solutions, all under one trusted name.
            </p>
          </div>

          <div>
            <h3 className="text-[#F7F2EA] text-sm font-semibold mb-3">Cleaning</h3>
            <ul className="space-y-2 text-sm text-[#a89880]">
              <li><Link href="/services" className="hover:text-[#F7F2EA] transition-colors">Residential</Link></li>
              <li><Link href="/services" className="hover:text-[#F7F2EA] transition-colors">Commercial</Link></li>
              <li><Link href="/services" className="hover:text-[#F7F2EA] transition-colors">Transparency Policy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#F7F2EA] text-sm font-semibold mb-3">Transportation</h3>
            <ul className="space-y-2 text-sm text-[#7a6d5c]">
              <li><Link href="/transportation" className="hover:text-[#a89880] transition-colors">Personal (coming soon)</Link></li>
              <li><Link href="/transportation" className="hover:text-[#a89880] transition-colors">Corporate (coming soon)</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#F7F2EA] text-sm font-semibold mb-3">Digital</h3>
            <ul className="space-y-2 text-sm text-[#a89880]">
              <li><Link href="/digital" className="hover:text-[#F7F2EA] transition-colors">Web design</Link></li>
              <li><Link href="/digital" className="hover:text-[#F7F2EA] transition-colors">App development</Link></li>
              <li><Link href="/digital" className="hover:text-[#F7F2EA] transition-colors">Booking systems</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#F7F2EA] text-sm font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-[#a89880]">
              <li><Link href="/about" className="hover:text-[#F7F2EA] transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-[#F7F2EA] transition-colors">Contact</Link></li>
              <li><a href="https://portal.scratchsolidsolutions.org/signup/cleaner" className="hover:text-[#F7F2EA] transition-colors">Careers</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8a7a68]">
          <span>&copy; {new Date().getFullYear()} Scratch Solid Solutions. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#a89880] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#a89880] transition-colors">Terms</Link>
            <a href="https://wa.me/27696735947" target="_blank" rel="noopener noreferrer" className="hover:text-[#a89880] transition-colors">WhatsApp</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
