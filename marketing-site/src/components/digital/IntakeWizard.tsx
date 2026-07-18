"use client";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type SupportTier = "warranty" | "standard" | "growth" | "partner";

const SUPPORT_TIERS: {
  id: SupportTier;
  label: string;
  term: string;
  rate: number;
  minMonths: number;
  features: string[];
  recommended?: boolean;
}[] = [
  { id: "warranty", label: "Warranty only", term: "30 days, included", rate: 0, minMonths: 0, features: ["Bug fixes only", "Email support", "No new work included"] },
  { id: "standard", label: "Standard", term: "3-month minimum", rate: 1200, minMonths: 3, features: ["Bug fixes", "Minor text/content edits", "48-hour email response"] },
  { id: "growth", label: "Growth", term: "6-month minimum", rate: 2200, minMonths: 6, features: ["Everything in Standard", "4 hrs/mo small feature work", "24-hour priority response"], recommended: true },
  { id: "partner", label: "Partner retainer", term: "12-month, or month-to-month after", rate: 3800, minMonths: 12, features: ["Everything in Growth", "8 hrs/mo feature work", "Monthly check-in call", "Same-day priority response"] },
];

const STEP_NAMES = ["Who", "What", "Why", "When", "Where", "How", "Branding", "Backend", "Support", "Review"];
const TOTAL_STEPS = STEP_NAMES.length;

const inputClass = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E]";
const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

export default function IntakeWizard({ isOpen, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"wizard" | "mockup" | "submitted">("wizard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 5W1H + branding + backend fields
  const [whoPrimary, setWhoPrimary] = useState("");
  const [whoOther, setWhoOther] = useState("");
  const [whatDescription, setWhatDescription] = useState("");
  const [whatFeatures, setWhatFeatures] = useState<string[]>([]);
  const [whyProblem, setWhyProblem] = useState("");
  const [whySuccess, setWhySuccess] = useState("");
  const [whenChip, setWhenChip] = useState("6–8 weeks");
  const [whenFixedDates, setWhenFixedDates] = useState("");
  const [wherePlatform, setWherePlatform] = useState("Website");
  const [whereAudience, setWhereAudience] = useState("");
  const [howDescription, setHowDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [colorPrimary, setColorPrimary] = useState("#B08A5E");
  const [colorSecondary, setColorSecondary] = useState("#2E1F16");
  const [colorAccent, setColorAccent] = useState("#F7F2EA");
  const [backendData, setBackendData] = useState("");
  const [backendAccounts, setBackendAccounts] = useState("");
  const [backendIntegrations, setBackendIntegrations] = useState("");
  const [supportTier, setSupportTier] = useState<SupportTier>("growth");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Mockup phase state
  const [intakeId, setIntakeId] = useState<number | null>(null);
  const [mockupHtml, setMockupHtml] = useState("");
  const [iterationsUsed, setIterationsUsed] = useState(0);
  const [iterationsRemaining, setIterationsRemaining] = useState(8);
  const [showChangeBox, setShowChangeBox] = useState(false);
  const [changeRequest, setChangeRequest] = useState("");
  const [mockupLoading, setMockupLoading] = useState(false);

  function reset() {
    setStep(0);
    setPhase("wizard");
    setSubmitting(false);
    setError("");
    setWhoPrimary(""); setWhoOther("");
    setWhatDescription(""); setWhatFeatures([]);
    setWhyProblem(""); setWhySuccess("");
    setWhenChip("6–8 weeks"); setWhenFixedDates("");
    setWherePlatform("Website"); setWhereAudience("");
    setHowDescription("");
    setCompanyName(""); setLogoFile(null); setLogoUrl("");
    setColorPrimary("#B08A5E"); setColorSecondary("#2E1F16"); setColorAccent("#F7F2EA");
    setBackendData(""); setBackendAccounts(""); setBackendIntegrations("");
    setSupportTier("growth");
    setContactName(""); setContactEmail("");
    setIntakeId(null); setMockupHtml("");
    setIterationsUsed(0); setIterationsRemaining(8);
    setShowChangeBox(false); setChangeRequest(""); setMockupLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleFeature(f: string) {
    setWhatFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "intake-logos");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json() as { publicUrl?: string; error?: string };
      if (res.ok && data.publicUrl) setLogoUrl(data.publicUrl);
    } catch {
      // Non-fatal — client can continue without a logo.
    } finally {
      setLogoUploading(false);
    }
  }

  const selectedTier = SUPPORT_TIERS.find((t) => t.id === supportTier)!;

  async function generateFirstMockup() {
    setSubmitting(true);
    setError("");
    try {
      const whoTargetUsers = whoOther ? `${whoPrimary}\n\nOther user types: ${whoOther}` : whoPrimary;
      const whatFull = whatFeatures.length ? `${whatDescription}\n\nKey features requested: ${whatFeatures.join(", ")}` : whatDescription;
      const whyFull = whySuccess ? `${whyProblem}\n\nSuccess looks like: ${whySuccess}` : whyProblem;
      const whenFull = whenFixedDates ? `${whenChip}. Fixed dates: ${whenFixedDates}` : whenChip;
      const whereFull = `${wherePlatform}${whereAudience ? ` — ${whereAudience}` : ""}`;
      const backendFull = [
        backendData && `Data to store: ${backendData}`,
        backendAccounts && `Accounts/logins: ${backendAccounts}`,
        backendIntegrations && `Integrations: ${backendIntegrations}`,
      ].filter(Boolean).join("\n");

      // Reuse the existing draft if the client already created one (e.g. the
      // mockup call below failed on a prior attempt and the user hit
      // Generate again) - otherwise every retry creates a new orphaned draft
      // row instead of continuing the same one.
      let currentIntakeId = intakeId;
      if (!currentIntakeId) {
        const createRes = await fetch("/api/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: contactEmail.trim(),
            name: contactName.trim(),
            company_name: companyName.trim(),
            who_target_users: whoTargetUsers,
            what_description: whatFull,
            why_description: whyFull,
            when_timeline: whenFull,
            where_context: whereFull,
            how_description: howDescription,
            backend_interaction_description: backendFull,
            logo_file_url: logoUrl,
            color_theme: JSON.stringify({ primary: colorPrimary, secondary: colorSecondary, accent: colorAccent }),
            support_tier: selectedTier.id,
            support_monthly_rate: selectedTier.rate,
            support_min_term_months: selectedTier.minMonths,
          }),
        });
        const created = await createRes.json() as { id?: number; error?: string };
        if (!createRes.ok || !created.id) {
          setError(created.error || "Failed to submit your project details.");
          setSubmitting(false);
          return;
        }
        currentIntakeId = created.id;
        setIntakeId(created.id);
      }

      const mockupRes = await fetch(`/api/intake/${currentIntakeId}/mockup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const mockupData = await mockupRes.json() as { html?: string; iterations_used?: number; iterations_remaining?: number; error?: string };
      if (!mockupRes.ok || !mockupData.html) {
        setError(mockupData.error || "Failed to generate your mockup.");
        setSubmitting(false);
        return;
      }
      setMockupHtml(mockupData.html);
      setIterationsUsed(mockupData.iterations_used || 1);
      setIterationsRemaining(mockupData.iterations_remaining ?? 7);
      setPhase("mockup");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestMockupChange() {
    if (!intakeId || !changeRequest.trim()) return;
    setMockupLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/intake/${intakeId}/mockup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change_request: changeRequest.trim() }),
      });
      const data = await res.json() as { html?: string; iterations_used?: number; iterations_remaining?: number; error?: string };
      if (!res.ok || !data.html) {
        setError(data.error || "Failed to update your mockup.");
        return;
      }
      setMockupHtml(data.html);
      setIterationsUsed(data.iterations_used || iterationsUsed + 1);
      setIterationsRemaining(data.iterations_remaining ?? Math.max(0, iterationsRemaining - 1));
      setChangeRequest("");
      setShowChangeBox(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setMockupLoading(false);
    }
  }

  async function confirmMockup() {
    if (!intakeId) return;
    setMockupLoading(true);
    try {
      await fetch(`/api/intake/${intakeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      setPhase("submitted");
    } catch {
      setError("Network error confirming your mockup. Please try again.");
    } finally {
      setMockupLoading(false);
    }
  }

  if (!isOpen) return null;

  const canContinue = (() => {
    switch (step) {
      case 0: return whoPrimary.trim().length > 0;
      case 1: return whatDescription.trim().length > 0;
      case 2: return whyProblem.trim().length > 0;
      case 8: return true;
      case 9: return contactName.trim().length > 0 && contactEmail.trim().length > 0;
      default: return true;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, #2E1F16, #3a281a)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[#B08A5E] font-semibold">
              {phase === "wizard" ? "Start a project" : phase === "mockup" ? "Your mockup" : "Request received"}
            </p>
            <button onClick={handleClose} className="text-[#CBB89A] hover:text-[#F7F2EA] transition-colors text-2xl leading-none">&times;</button>
          </div>
          <h2 className="text-[#F7F2EA] font-normal text-xl" style={{ fontFamily: "Georgia, serif" }}>
            {phase === "wizard" ? STEP_NAMES[step] + (step <= 7 ? "" : step === 8 ? " after launch" : " your answers") : phase === "mockup" ? "Here's what we understood" : "Thank you!"}
          </h2>
          {phase === "wizard" && (
            <>
              <div className="flex gap-1 mt-4">
                {STEP_NAMES.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-[#B08A5E]" style={{ width: i <= step ? "100%" : "0%" }} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#c9b89a] mt-2">Step {step + 1} of {TOTAL_STEPS} &middot; {STEP_NAMES[step]}</p>
            </>
          )}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {phase === "wizard" && step === 0 && (
            <>
              <p className="text-sm text-gray-500">Tell us about the people this app or site is really for.</p>
              <div>
                <label className={labelClass}>Who are your primary users? <span className="text-red-500">*</span></label>
                <textarea className={inputClass} rows={3} value={whoPrimary} onChange={(e) => setWhoPrimary(e.target.value)} placeholder="e.g. parents of school-age kids looking for a tutor" />
              </div>
              <div>
                <label className={labelClass}>Any other user types? (staff, admins, a second audience)</label>
                <input className={inputClass} value={whoOther} onChange={(e) => setWhoOther(e.target.value)} placeholder="e.g. tutors who list their availability" />
              </div>
            </>
          )}

          {phase === "wizard" && step === 1 && (
            <>
              <p className="text-sm text-gray-500">Keep it simple — one or two sentences, plus the must-have features.</p>
              <div>
                <label className={labelClass}>In one or two sentences, what is it? <span className="text-red-500">*</span></label>
                <textarea className={inputClass} rows={3} value={whatDescription} onChange={(e) => setWhatDescription(e.target.value)} placeholder="e.g. a marketplace where parents can find, book, and pay tutors" />
              </div>
              <div>
                <label className={labelClass}>Which of these does it need?</label>
                <div className="flex flex-wrap gap-2">
                  {["Booking / scheduling", "Payments", "Messaging", "User accounts", "Search / filtering", "Admin dashboard"].map((f) => (
                    <button key={f} type="button" onClick={() => toggleFeature(f)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${whatFeatures.includes(f) ? "bg-[#2E1F16] border-[#2E1F16] text-[#F7F2EA]" : "border-gray-300 text-gray-600 hover:border-[#B08A5E]"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {phase === "wizard" && step === 2 && (
            <>
              <p className="text-sm text-gray-500">What's happening today without it — and why isn't that good enough?</p>
              <div>
                <label className={labelClass}>What do people do today, without this? <span className="text-red-500">*</span></label>
                <textarea className={inputClass} rows={3} value={whyProblem} onChange={(e) => setWhyProblem(e.target.value)} placeholder="e.g. WhatsApp groups and word of mouth" />
              </div>
              <div>
                <label className={labelClass}>What's the one outcome that would make this a success?</label>
                <input className={inputClass} value={whySuccess} onChange={(e) => setWhySuccess(e.target.value)} placeholder="e.g. parents book a tutor in under 5 minutes" />
              </div>
            </>
          )}

          {phase === "wizard" && step === 3 && (
            <>
              <p className="text-sm text-gray-500">Rough is fine — this just helps our team plan.</p>
              <div className="flex flex-wrap gap-2">
                {["ASAP", "6–8 weeks", "2–3 months", "No fixed deadline"].map((c) => (
                  <button key={c} type="button" onClick={() => setWhenChip(c)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${whenChip === c ? "bg-[#2E1F16] border-[#2E1F16] text-[#F7F2EA]" : "border-gray-300 text-gray-600 hover:border-[#B08A5E]"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div>
                <label className={labelClass}>Any fixed dates we should know about?</label>
                <input className={inputClass} value={whenFixedDates} onChange={(e) => setWhenFixedDates(e.target.value)} placeholder="e.g. needs to launch before the new school term" />
              </div>
            </>
          )}

          {phase === "wizard" && step === 4 && (
            <>
              <div>
                <label className={labelClass}>Where should this live?</label>
                <div className="flex flex-wrap gap-2">
                  {["Website", "Mobile app", "Both"].map((p) => (
                    <button key={p} type="button" onClick={() => setWherePlatform(p)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${wherePlatform === p ? "bg-[#2E1F16] border-[#2E1F16] text-[#F7F2EA]" : "border-gray-300 text-gray-600 hover:border-[#B08A5E]"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Who's your audience, geographically?</label>
                <input className={inputClass} value={whereAudience} onChange={(e) => setWhereAudience(e.target.value)} placeholder="e.g. Cape Town to start, national later" />
              </div>
            </>
          )}

          {phase === "wizard" && step === 5 && (
            <>
              <p className="text-sm text-gray-500">Describe it like a short story — what does someone actually do, step by step?</p>
              <textarea className={inputClass} rows={5} value={howDescription} onChange={(e) => setHowDescription(e.target.value)} placeholder="e.g. A parent searches by subject and area, sees tutor profiles with reviews, books an open slot, pays online, and gets a reminder before the session." />
            </>
          )}

          {phase === "wizard" && step === 6 && (
            <>
              <p className="text-sm text-gray-500">This helps your mockup actually look like your business.</p>
              <div>
                <label className={labelClass}>Company / brand name</label>
                <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Brightside Tutors" />
              </div>
              <div>
                <label className={labelClass}>Logo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center text-sm text-gray-500 bg-gray-50">
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="text-xs" />
                  {logoUploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
                  {logoUrl && <p className="text-xs text-green-600 mt-1">Logo uploaded ✓</p>}
                </div>
              </div>
              <div>
                <label className={labelClass}>Color theme</label>
                <div className="flex gap-4">
                  {[{ label: "Primary", value: colorPrimary, set: setColorPrimary }, { label: "Secondary", value: colorSecondary, set: setColorSecondary }, { label: "Accent", value: colorAccent, set: setColorAccent }].map((c) => (
                    <div key={c.label} className="flex flex-col items-center gap-1">
                      <input type="color" value={c.value} onChange={(e) => c.set(e.target.value)} className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer" />
                      <span className="text-xs text-gray-500">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {phase === "wizard" && step === 7 && (
            <>
              <p className="text-sm text-gray-500">The more detail here, the closer our team can build to exactly what you have in mind.</p>
              <div>
                <label className={labelClass}>What information does it need to store?</label>
                <textarea className={inputClass} rows={2} value={backendData} onChange={(e) => setBackendData(e.target.value)} placeholder="e.g. user profiles, bookings, payment history, tutor availability" />
              </div>
              <div>
                <label className={labelClass}>Does it need accounts / logins? For whom?</label>
                <input className={inputClass} value={backendAccounts} onChange={(e) => setBackendAccounts(e.target.value)} placeholder="e.g. separate parent and tutor accounts" />
              </div>
              <div>
                <label className={labelClass}>Any integrations? (payments, calendars, SMS, existing tools)</label>
                <input className={inputClass} value={backendIntegrations} onChange={(e) => setBackendIntegrations(e.target.value)} placeholder="e.g. card payments, Google Calendar sync, SMS reminders" />
              </div>
            </>
          )}

          {phase === "wizard" && step === 8 && (
            <>
              <p className="text-sm text-gray-500 mb-1">We're upfront about this from day one — pick a term below, and you'll see exactly what it costs and what's covered.</p>
              <div className="flex gap-2 items-start bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-2">
                <span>&#128269;</span>
                <p className="text-xs text-blue-800">Every project ships with a <b>30-day warranty at no cost</b> — that covers anything that's actually our bug. Everything below is optional ongoing support beyond that.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORT_TIERS.map((t) => (
                  <button key={t.id} type="button" onClick={() => setSupportTier(t.id)}
                    className={`relative text-left rounded-xl border-2 p-3 transition-colors ${supportTier === t.id ? "border-[#B08A5E] bg-[#F7F2EA]" : "border-gray-200 hover:border-[#D3C6AE]"}`}>
                    {t.recommended && <span className="absolute -top-2 left-3 bg-[#B08A5E] text-[#2E1F16] text-[10px] font-bold px-2 py-0.5 rounded-full">Most common</span>}
                    <p className="text-sm font-bold text-gray-800 mt-1">{t.label}</p>
                    <p className="text-[11px] text-gray-500 mb-1">{t.term}</p>
                    <p className="font-serif text-lg text-gray-900">R{t.rate.toLocaleString()}<span className="text-[10px] font-sans text-gray-400"> /mo</span></p>
                    <ul className="text-[11px] text-gray-500 mt-2 space-y-0.5">
                      {t.features.map((f) => <li key={f}>&#10003; {f}</li>)}
                    </ul>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 border-t border-gray-200 pt-2">
                <b className="text-gray-700">How this is billed:</b> a flat monthly rate, invoiced monthly, cancel anytime once your minimum term is up. Unused hours roll over one month. Every invoice is itemized.
              </p>
            </>
          )}

          {phase === "wizard" && step === 9 && (
            <>
              <p className="text-sm text-gray-500">Take a look, then generate your first mockup.</p>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelClass}>Your name <span className="text-red-500">*</span></label><input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
                <div><label className={labelClass}>Your email <span className="text-red-500">*</span></label><input type="email" className={inputClass} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2"><p className="text-xs font-semibold text-[#8a6a45] uppercase">Who</p><p className="text-gray-700 line-clamp-2">{whoPrimary || "—"}</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2"><p className="text-xs font-semibold text-[#8a6a45] uppercase">What</p><p className="text-gray-700 line-clamp-2">{whatDescription || "—"}</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2"><p className="text-xs font-semibold text-[#8a6a45] uppercase">When</p><p className="text-gray-700 line-clamp-2">{whenChip}</p></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2"><p className="text-xs font-semibold text-[#8a6a45] uppercase">Support</p><p className="text-gray-700">{selectedTier.label} — R{selectedTier.rate}/mo</p></div>
              </div>
            </>
          )}

          {phase === "mockup" && (
            <>
              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-gray-300" /><span className="w-2 h-2 rounded-full bg-gray-300" /><span className="w-2 h-2 rounded-full bg-gray-300" />
                  <span className="ml-2 text-[11px] text-gray-400 bg-white border border-gray-200 rounded px-2 py-0.5 flex-1">preview · your-app.mockup</span>
                </div>
                <iframe title="AI-generated mockup preview" srcDoc={mockupHtml} className="w-full h-72 bg-white" sandbox="" />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Refinement rounds used</span>
                <span className="font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5">Iteration {iterationsUsed} of 8</span>
              </div>
              <p className="text-sm text-gray-600">This is a visual sketch to confirm we understood your idea &mdash; not the real build. Our team builds the actual project by hand from your full brief.</p>
              <div className="flex flex-col gap-2">
                <button onClick={confirmMockup} disabled={mockupLoading} className="w-full py-2.5 bg-[#B08A5E] text-[#2E1F16] font-bold rounded-xl hover:bg-[#c39a6c] disabled:opacity-50 transition-colors">
                  {mockupLoading ? "Working…" : "✓ Yes, that's it"}
                </button>
                {iterationsRemaining > 0 ? (
                  <button onClick={() => setShowChangeBox((v) => !v)} className="w-full py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                    Request a change
                  </button>
                ) : (
                  <p className="text-xs text-center text-gray-400">You've used all 8 refinement rounds &mdash; our team will follow up directly to finalize the details.</p>
                )}
              </div>
              {showChangeBox && (
                <div className="space-y-2">
                  <textarea className={inputClass} rows={3} value={changeRequest} onChange={(e) => setChangeRequest(e.target.value)} placeholder="e.g. make the accent color green, add a 'how it works' section..." />
                  <button onClick={requestMockupChange} disabled={mockupLoading || !changeRequest.trim()} className="w-full py-2.5 bg-[#2E1F16] text-[#F7F2EA] font-semibold rounded-xl hover:bg-[#241811] disabled:opacity-50 transition-colors">
                    {mockupLoading ? "Regenerating…" : "Regenerate mockup"}
                  </button>
                </div>
              )}
            </>
          )}

          {phase === "submitted" && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-lg font-bold text-gray-800 mb-2">Thanks, {contactName || "there"}!</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">Your brief and confirmed mockup are now with our Digital team. We'll be in touch at <span className="font-semibold">{contactEmail}</span> to kick things off.</p>
              <button onClick={handleClose} className="mt-6 py-2.5 px-6 bg-[#2E1F16] text-[#F7F2EA] font-semibold rounded-xl hover:bg-[#241811] transition-colors">Close</button>
            </div>
          )}
        </div>

        {phase === "wizard" && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-40 transition-colors">
              &larr; Back
            </button>
            {step < TOTAL_STEPS - 1 ? (
              <button onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))} disabled={!canContinue} className="flex-1 py-3 bg-[#B08A5E] text-[#2E1F16] font-bold rounded-xl hover:bg-[#c39a6c] disabled:opacity-40 transition-colors">
                Continue &rarr;
              </button>
            ) : (
              <button onClick={generateFirstMockup} disabled={!canContinue || submitting} className="flex-1 py-3 bg-[#B08A5E] text-[#2E1F16] font-bold rounded-xl hover:bg-[#c39a6c] disabled:opacity-40 transition-colors">
                {submitting ? "Generating…" : "Generate my mockup →"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
