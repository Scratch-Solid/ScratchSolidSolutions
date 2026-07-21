"use client";
import { useState, useEffect, useCallback } from "react";
import {
  calculateQuote,
  type QuoteRequest,
  type QuoteResult,
} from "@/lib/pricing-engine";
import { authFetch, getCsrfToken } from "@/lib/authFetch";

interface Service {
  id: number;
  name: string;
  description: string;
  base_price: number;
  room_multiplier: number;
  is_active: number;
  icon: string;
}

interface ServicePricing {
  id: number;
  service_id: number;
  price: number;
  unit_price: number;
  unit: string;
  min_quantity: number;
  max_quantity: number | null;
  client_type: string;
  special_price: number | null;
  special_label: string;
  special_valid_from: string | null;
  special_valid_until: string | null;
}

interface PromoResult {
  valid: boolean;
  error?: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  valid_until?: string;
}

interface BookingQuotePanelProps {
  mode: "client" | "business";
  selectedDate?: string;
  selectedTimeSlot?: string;
  onSuccess?: (bookingId: number, totalAmount: number) => void;
  onCancel?: () => void;
}

const PROPERTY_TYPES = [
  { value: "residential", label: "🏠 Residential" },
  { value: "office", label: "🏢 Office" },
  { value: "commercial", label: "🏗️ Commercial" },
  { value: "post-construction", label: "🔨 Post-Construction" },
  { value: "short-term-stay", label: "🏨 Short-Term Stay" },
] as const;

type PropertyType = (typeof PROPERTY_TYPES)[number]["value"];

const TIME_SLOTS = [
  { value: "08:00-12:00", label: "Morning (08:00–12:00)" },
  { value: "13:00-17:00", label: "Afternoon (13:00–17:00)" },
];

const PAYMENT_METHODS = [
  { value: "card", label: "💳 Card (Paystack)", badge: "Instant" },
  { value: "eft", label: "🏦 EFT", badge: "Manual" },
  { value: "cash", label: "💵 Cash", badge: "On-site" },
] as const;

export default function BookingQuotePanel({
  mode,
  selectedDate: initialDate = "",
  selectedTimeSlot: initialSlot = "",
  onSuccess,
  onCancel,
}: BookingQuotePanelProps) {
  // Data
  const [services, setServices] = useState<Service[]>([]);
  const [pricing, setPricing] = useState<ServicePricing[]>([]);
  const [areas, setAreas] = useState<{ id: number; name: string; transport_fee: number }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Booking config
  const [propertyType, setPropertyType] = useState<PropertyType>("residential");
  const [area, setArea] = useState("Durbanville");
  const [quantity, setQuantity] = useState(3);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState(initialDate);
  const [timeSlot, setTimeSlot] = useState(initialSlot);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "eft" | "cash">("card");
  const [bookingType, setBookingType] = useState<"once_off" | "recurring">("once_off");
  const [location, setLocation] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Promo
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Calculation
  const [calc, setCalc] = useState<QuoteResult | null>(null);

  // Submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPolicy, setShowPolicy] = useState(false);

  // EFT payment step - shown after booking creation instead of immediate
  // success when payment_method is "eft", since the client still needs to
  // make the transfer and tell us the reference before we can confirm.
  const [pendingEftBookingId, setPendingEftBookingId] = useState<number | null>(null);
  const [bankingDetails, setBankingDetails] = useState<{ bank_name: string; account_number: string; account_holder: string; branch_code: string; account_type: string } | null>(null);
  const [bankingLoading, setBankingLoading] = useState(false);
  const [popReference, setPopReference] = useState("");
  const [popFile, setPopFile] = useState<File | null>(null);
  const [popSubmitting, setPopSubmitting] = useState(false);
  const [popError, setPopError] = useState("");

  // Same-day area clustering suggestion - lets a cleaner reach 2+ jobs a day
  // in one area instead of one job spread across separate days. Always
  // just a suggestion: accepting updates bookingDate, declining keeps the
  // client's own choice with no other effect.
  const [clusterSuggestion, setClusterSuggestion] = useState<{ suggestedDate: string; existingBookingsCount: number } | null>(null);
  const [clusterSuggestionDismissed, setClusterSuggestionDismissed] = useState(false);

  useEffect(() => {
    setClusterSuggestion(null);
    setClusterSuggestionDismissed(false);
    if (!area || !bookingDate) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/bookings/suggest-cluster?suburb=${encodeURIComponent(area)}&date=${encodeURIComponent(bookingDate)}`);
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (data.hasSuggestion && !data.isPreferredDate) {
          setClusterSuggestion({ suggestedDate: data.suggestedDate, existingBookingsCount: data.existingBookingsCount });
        }
      } catch {
        // Suggestion is a nice-to-have - silently skip on any failure
      }
    })();

    return () => { cancelled = true; };
  }, [area, bookingDate]);

  const isResidential = propertyType === "residential" || propertyType === "short-term-stay";

  // Fetch services + pricing + areas once
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, pRes, aRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/service-pricing"),
          fetch("/api/areas"),
        ]);
        const sData: Service[] = sRes.ok ? await sRes.json() : [];
        const pData: ServicePricing[] = pRes.ok ? await pRes.json() : [];
        setServices(sData.filter((s) => s.is_active !== 0));
        setPricing(pData);
        if (aRes.ok) {
          const aData = await aRes.json();
          const areaList = aData.areas || [];
          setAreas(areaList);
          if (areaList.length > 0) setArea(areaList[0].name);
        }
      } catch {
        // silently fall back
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
    // Pre-fill location from localStorage
    const saved = localStorage.getItem("userAddress");
    if (saved) setLocation(saved);
  }, []);

  // Enforce quantity bounds when property type changes
  useEffect(() => {
    if (isResidential) {
      setQuantity((q) => Math.min(Math.max(q, 1), 10));
    } else {
      setQuantity((q) => Math.max(q, 50));
    }
  }, [propertyType]);

  // Get pricing row for a service (prefers client_type match)
  const getPricingRow = useCallback(
    (serviceId: number): ServicePricing | null => {
      const rows = pricing.filter((p) => p.service_id === serviceId);
      const clientType = mode === "business" ? "business" : "individual";
      return (
        rows.find((r) => r.client_type === clientType) ||
        rows.find((r) => r.client_type === "all") ||
        rows[0] ||
        null
      );
    },
    [pricing, mode]
  );

  // Recalculate whenever inputs change
  useEffect(() => {
    if (!selectedServiceId) {
      setCalc(null);
      return;
    }
    const row = getPricingRow(selectedServiceId);
    const request: QuoteRequest = {
      serviceId: selectedServiceId,
      propertyType: propertyType as QuoteRequest["propertyType"],
      area,
      quantity,
      promoCode: promoResult?.valid ? promoInput.trim() : undefined,
      bookingDate: bookingDate || undefined,
    };
    const specialPricing = row?.special_price
      ? {
          specialPrice: row.special_price,
          specialLabel: row.special_label,
          specialValidFrom: row.special_valid_from || undefined,
          specialValidUntil: row.special_valid_until || undefined,
        }
      : undefined;
    const promoData = promoResult?.valid
      ? {
          discountType: promoResult.discount_type || "percentage",
          discountValue: promoResult.discount_value || 0,
          validUntil: promoResult.valid_until || undefined,
        }
      : undefined;
    try {
      const areaFee = areas.find((a) => a.name === area)?.transport_fee;
      const result = calculateQuote(
        request,
        specialPricing,
        promoData,
        0,
        row?.price || 0,
        row?.unit_price || 0,
        areaFee
      );
      setCalc(result);
    } catch {
      setCalc(null);
    }
  }, [selectedServiceId, propertyType, area, quantity, promoResult, promoInput, bookingDate, getPricingRow, areas]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const res = await fetch(`/api/promo-codes?code=${encodeURIComponent(promoInput.trim())}`);
      const data = await res.json();
      setPromoResult(data);
    } catch {
      setPromoResult({ valid: false, error: "Failed to validate promo code" });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!selectedServiceId) return setError("Please select a service.");
    if (!bookingDate) return setError("Please select a date.");
    if (!timeSlot) return setError("Please select a time slot.");
    if (!calc) return setError("Unable to calculate price. Please try again.");

    setLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      const userName = localStorage.getItem("userName") || "";
      const selectedService = services.find((s) => s.id === selectedServiceId);

      // Get CSRF token
      const csrfToken = await getCsrfToken();

      const res = await authFetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          client_id: parseInt(userId || "0"),
          client_name: userName,
          location: location || localStorage.getItem("userAddress") || "",
          suburb: area,
          service_id: selectedServiceId,
          service_type: selectedService?.name || selectedServiceId.toString(),
          quantity,
          booking_date: bookingDate,
          booking_time: timeSlot.split("-")[0],
          booking_type: bookingType,
          cleaning_type: propertyType,
          payment_method: paymentMethod,
          special_instructions: [
            specialInstructions,
            `Property: ${propertyType}`,
            `Area: ${area}`,
            isResidential ? `Bedrooms: ${quantity}` : `Size: ${quantity}m²`,
          ]
            .filter(Boolean)
            .join(" | "),
          loyalty_discount: 0,
          // Advisory only - the server independently recomputes and stores
          // the authoritative price from service_id/quantity/suburb/promo_code,
          // never trusts this value for what actually gets charged.
          price: calc.finalPrice,
          promo_code: promoResult?.valid ? promoInput.trim() : undefined,
        }),
      });

      const data = await res.json() as { id?: number; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error || "Booking failed. Please try again.");
        return;
      }

      if (paymentMethod === "card") {
        const userEmail = localStorage.getItem("userEmail") || "";
        const callbackUrl = `${window.location.origin}/payment/verify`;

        const paystackRes = await authFetch("/api/payments/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: data.id,
            email: userEmail,
            amount: calc.finalPrice,
            callback_url: callbackUrl,
          }),
        });

        const paystackData = await paystackRes.json() as { authorization_url?: string; error?: string };
        if (!paystackRes.ok || !paystackData.authorization_url) {
          setError(paystackData.error || "Payment initialization failed. Your booking is saved as pending - please contact support to complete payment.");
          return;
        }

        window.location.href = paystackData.authorization_url;
        return; // Navigating away - leave loading true
      }

      if (paymentMethod === "eft") {
        setPendingEftBookingId(data.id);
        setBankingLoading(true);
        try {
          const bankRes = await authFetch("/api/banking-details");
          if (bankRes.ok) {
            const bankData = await bankRes.json() as { bank_name: string; account_number: string; account_holder: string; branch_code: string; account_type: string } | null;
            setBankingDetails(bankData);
          }
        } finally {
          setBankingLoading(false);
        }
        return;
      }

      // Cash: paid on-site, nothing more to collect upfront.
      setSuccess("Booking confirmed! You will receive a confirmation email shortly.");
      onSuccess?.(data.id, calc.finalPrice);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEftProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPopFile(file);
  };

  const handleEftSubmit = async () => {
    if (!pendingEftBookingId) return;
    setPopError("");
    if (!popReference.trim()) {
      setPopError("Please enter the payment reference from your EFT.");
      return;
    }

    setPopSubmitting(true);
    try {
      let popUrl = "";
      if (popFile) {
        const formData = new FormData();
        formData.append("file", popFile);
        formData.append("folder", "payment-proofs");
        const uploadRes = await authFetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json() as { publicUrl: string };
          popUrl = uploadData.publicUrl;
        }
      }

      const res = await authFetch(`/api/pop-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: pendingEftBookingId, pop_reference: popReference.trim(), pop_upload_url: popUrl || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setPopError(data.error || "Failed to submit payment details. Please try again.");
        return;
      }

      setSuccess("Payment details submitted! We'll confirm your booking once the transfer is verified (usually within 1 business day).");
      onSuccess?.(pendingEftBookingId, calc?.finalPrice || 0);
    } catch {
      setPopError("Network error. Please try again.");
    } finally {
      setPopSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h3 className="text-xl font-bold text-green-800">Booking Confirmed!</h3>
        <p className="text-green-700">{success}</p>
        <button
          onClick={onCancel}
          className="mt-4 rounded-full bg-[#B08A5E] px-8 py-3 text-[#2E1F16] font-semibold hover:bg-[#c39a6c] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (pendingEftBookingId) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="text-4xl">🏦</div>
          <h3 className="text-xl font-bold text-gray-800">Complete Your EFT Payment</h3>
          <p className="text-sm text-gray-500">Your booking is reserved - transfer the amount below, then tell us the payment reference.</p>
        </div>

        {popError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">{popError}</p>
          </div>
        )}

        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
          {bankingLoading ? (
            <p className="text-sm text-gray-500">Loading banking details…</p>
          ) : bankingDetails ? (
            <>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Bank</span><span className="font-semibold text-gray-800">{bankingDetails.bank_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Account Holder</span><span className="font-semibold text-gray-800">{bankingDetails.account_holder}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Account Number</span><span className="font-semibold text-gray-800">{bankingDetails.account_number}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Branch Code</span><span className="font-semibold text-gray-800">{bankingDetails.branch_code}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Account Type</span><span className="font-semibold text-gray-800 capitalize">{bankingDetails.account_type}</span></div>
              {calc && <div className="flex justify-between text-sm pt-2 border-t border-gray-200"><span className="text-gray-500">Amount Due</span><span className="font-bold text-[#2E1F16]">R{calc.finalPrice.toFixed(2)}</span></div>}
            </>
          ) : (
            <p className="text-sm text-red-600">Unable to load banking details. Please contact support to arrange payment.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Payment Reference <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={popReference}
            onChange={(e) => setPopReference(e.target.value)}
            placeholder="e.g. the reference shown on your EFT confirmation"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-[#B08A5E] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Proof of Payment (optional)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleEftProofUpload}
            className="w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#F7F2EA] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#8a6a45] hover:file:bg-[#F0E6D6]"
          />
          {popFile && <p className="text-xs text-gray-500 mt-1">Selected: {popFile.name}</p>}
        </div>

        <button
          onClick={handleEftSubmit}
          disabled={popSubmitting || !popReference.trim()}
          className="w-full rounded-full bg-[#B08A5E] px-8 py-3 text-[#2E1F16] font-semibold hover:bg-[#c39a6c] transition-colors disabled:opacity-50"
        >
          {popSubmitting ? "Submitting…" : "Submit Payment Details"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* ── STEP 1: Property details ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h3 className="font-bold text-gray-800 text-base">1. Property Details</h3>

        {/* Property type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Property Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => setPropertyType(pt.value)}
                className={`text-sm px-3 py-2 rounded-xl border-2 font-medium transition-all ${
                  propertyType === pt.value
                    ? "border-[#B08A5E] bg-[#F7F2EA] text-[#2E1F16]"
                    : "border-gray-200 text-gray-600 hover:border-[#D3C6AE]"
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Area <span className="text-red-500">*</span>
          </label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
          >
            {areas.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity: bedrooms or m² */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {isResidential ? "Number of Bedrooms" : "Size (m²)"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setQuantity((q) => Math.max(isResidential ? 1 : 50, q - 1))
              }
              className="w-9 h-9 rounded-full border-2 border-gray-300 text-gray-700 font-bold text-lg hover:border-[#B08A5E] hover:text-[#8a6a45] transition-colors flex items-center justify-center"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(isResidential ? 1 : 50, parseInt(e.target.value) || 1)
                )
              }
              min={isResidential ? 1 : 50}
              max={isResidential ? 10 : 2000}
              className="w-20 text-center border border-gray-300 rounded-xl px-2 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
            />
            <button
              onClick={() =>
                setQuantity((q) => Math.min(isResidential ? 10 : 2000, q + 1))
              }
              className="w-9 h-9 rounded-full border-2 border-gray-300 text-gray-700 font-bold text-lg hover:border-[#B08A5E] hover:text-[#8a6a45] transition-colors flex items-center justify-center"
            >
              +
            </button>
            <span className="text-sm text-gray-500">
              {isResidential ? "bedrooms (1–10)" : "m² (50–2000)"}
            </span>
          </div>
        </div>

        {/* Location address */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Property Address
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. 12 Main Rd, Durbanville"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
          />
        </div>
      </div>

      {/* ── STEP 2: Service selection ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="font-bold text-gray-800 text-base">2. Select Service</h3>
        {dataLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#B08A5E]" />
            Loading services…
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-gray-500">No services available.</p>
        ) : (
          <div className="space-y-2">
            {services.map((svc) => {
              const row = getPricingRow(svc.id);
              const now = new Date().toISOString();
              const specialActive =
                row?.special_price !== null &&
                row?.special_price !== undefined &&
                (!row.special_valid_from || row.special_valid_from <= now) &&
                (!row.special_valid_until || row.special_valid_until >= now);
              const displayPrice = specialActive
                ? row!.special_price!
                : row?.price || 0;
              const unitPriceLabel = row?.unit_price
                ? ` + R${row.unit_price}/${isResidential ? "bed" : "m²"}`
                : "";
              return (
                <button
                  key={svc.id}
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedServiceId === svc.id
                      ? "border-[#B08A5E] bg-[#F7F2EA]"
                      : "border-gray-200 hover:border-[#D3C6AE] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {svc.icon && <span className="text-xl flex-shrink-0">{svc.icon}</span>}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{svc.name}</p>
                        {svc.description && (
                          <p className="text-xs text-gray-500 truncate">{svc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {displayPrice > 0 ? (
                        <>
                          <p className="font-bold text-[#8a6a45] text-sm">
                            R{displayPrice.toFixed(0)}
                            {unitPriceLabel}
                          </p>
                          {specialActive && (
                            <p className="text-xs text-green-600 font-medium">
                              {row?.special_label || "Special"}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Quote on request</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── STEP 3: Schedule ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h3 className="font-bold text-gray-800 text-base">3. Schedule</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Time Slot <span className="text-red-500">*</span>
            </label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
            >
              <option value="">Choose time slot</option>
              {TIME_SLOTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {clusterSuggestion && !clusterSuggestionDismissed && (
          <div className="rounded-xl border-2 border-[#E9E0D3] bg-[#F7F2EA] p-4 flex items-start gap-3">
            <span className="text-2xl">📍</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#2E1F16]">
                We already have a cleaner booked in {area} on {new Date(`${clusterSuggestion.suggestedDate}T00:00:00`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="text-xs text-[#3f342a] mt-0.5">
                Booking the same day usually means faster, more reliable service since your cleaner is already working nearby. Totally up to you.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setBookingDate(clusterSuggestion.suggestedDate);
                    setClusterSuggestionDismissed(true);
                  }}
                  className="rounded-full bg-[#B08A5E] px-4 py-1.5 text-xs font-semibold text-[#2E1F16] hover:bg-[#c39a6c] transition-colors"
                >
                  Book this day instead
                </button>
                <button
                  type="button"
                  onClick={() => setClusterSuggestionDismissed(true)}
                  className="rounded-full border border-[#D3C6AE] px-4 py-1.5 text-xs font-semibold text-[#8a6a45] hover:bg-[#F0E6D6] transition-colors"
                >
                  Keep my date
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Booking Type
          </label>
          <div className="flex gap-3">
            {(["once_off", "recurring"] as const).map((bt) => (
              <button
                key={bt}
                onClick={() => setBookingType(bt)}
                className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                  bookingType === bt
                    ? "border-[#B08A5E] bg-[#F7F2EA] text-[#2E1F16]"
                    : "border-gray-200 text-gray-500 hover:border-[#D3C6AE]"
                }`}
              >
                {bt === "once_off" ? "🗓 Once-off" : "🔄 Recurring"}
              </button>
            ))}
          </div>
        </div>

        {/* Special instructions */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Special Instructions
          </label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any specific requests or access instructions…"
            rows={2}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E] resize-none"
          />
        </div>
      </div>

      {/* ── STEP 4: Payment method ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="font-bold text-gray-800 text-base">4. Payment Method</h3>
        <div className="grid grid-cols-3 gap-3">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              onClick={() => setPaymentMethod(pm.value)}
              className={`p-3 rounded-xl border-2 transition-all text-center ${
                paymentMethod === pm.value
                  ? "border-[#B08A5E] bg-[#F7F2EA] text-[#2E1F16]"
                  : "border-gray-200 text-gray-600 hover:border-[#D3C6AE]"
              }`}
            >
              <p className="font-semibold text-xs leading-tight">{pm.label}</p>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                  pm.value === "card"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {pm.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Promo code ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <h3 className="font-bold text-gray-800 text-base">Promo Code (optional)</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="Enter promo code"
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E] uppercase"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoLoading || !promoInput.trim()}
            className="px-4 py-2 rounded-xl bg-[#B08A5E] text-[#2E1F16] text-sm font-semibold hover:bg-[#c39a6c] transition-colors disabled:opacity-50"
          >
            {promoLoading ? "…" : "Apply"}
          </button>
        </div>
        {promoResult && (
          <p
            className={`text-sm font-medium ${
              promoResult.valid ? "text-green-700" : "text-red-600"
            }`}
          >
            {promoResult.valid
              ? `✓ Promo applied — ${
                  promoResult.discount_type === "percentage"
                    ? `${promoResult.discount_value}% off`
                    : `R${promoResult.discount_value} off`
                }`
              : `✗ ${promoResult.error || "Invalid code"}`}
          </p>
        )}
      </div>

      {/* ── Price Breakdown ── */}
      {selectedServiceId && calc && (
        <div className="rounded-2xl border-2 border-[#E9E0D3] bg-[#F7F2EA] p-5 space-y-2">
          <h3 className="font-bold text-[#2E1F16] text-base mb-3">Price Breakdown</h3>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>
                Base price
                {isResidential
                  ? ` (${quantity} bedroom${quantity !== 1 ? "s" : ""})`
                  : ` (${quantity} m²)`}
              </span>
              <span className="font-medium">R{calc.basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Transport fee ({area})</span>
              <span>R{calc.transportFee.toFixed(2)}</span>
            </div>
            {calc.specialDiscount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Special discount ({calc.specialLabel})</span>
                <span>−R{calc.specialDiscount.toFixed(2)}</span>
              </div>
            )}
            {calc.promoDiscount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Promo discount</span>
                <span>−R{calc.promoDiscount.toFixed(2)}</span>
              </div>
            )}
            {calc.afterHoursSurcharge > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>After-hours surcharge</span>
                <span>+R{calc.afterHoursSurcharge.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-[#E9E0D3] mt-3 pt-3 flex justify-between items-center">
            <span className="font-bold text-[#2E1F16] text-base">Total</span>
            <span className="font-bold text-[#2E1F16] text-2xl">
              R{calc.finalPrice.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-[#8a6a45] mt-1">
            {paymentMethod === "card"
              ? "Payment collected securely via Paystack before booking is confirmed."
              : paymentMethod === "eft"
              ? "EFT payment details will be emailed to you."
              : "Cash payment collected by cleaner on the day."}
          </p>
        </div>
      )}

      {!selectedServiceId && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
          <p className="text-sm text-gray-500">Select a service above to see your price breakdown</p>
        </div>
      )}

      {/* ── Cancellation & Rescheduling Policy ── */}
      {selectedServiceId && bookingDate && timeSlot && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPolicy(!showPolicy)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Cancellation & Rescheduling Policy
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showPolicy ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPolicy && (
            <div className="px-4 pb-4 text-xs text-gray-600 space-y-2">
              <p>
                <strong>Free cancellation:</strong> You may cancel or reschedule your booking free of charge up to
                24 hours before the scheduled service time for a full refund.
              </p>
              <p>
                <strong>Late cancellation (within 24 hours):</strong> Cancellations made less than 24 hours
                before the booking will not be eligible for a refund. The booking may still be cancelled but
                the fee will be forfeited.
              </p>
              <p>
                <strong>Rescheduling:</strong> You may reschedule your booking to a new date/time at no cost,
                provided the request is made at least 24 hours before the original booking time.
              </p>
              <p>
                <strong>How to cancel/reschedule:</strong> Visit your Client Dashboard, find the booking, and
                click the "Cancel" or "Reschedule" button. For card payments, refunds are processed
                automatically to your original payment method.
              </p>
              <p className="text-gray-500">
                By confirming this booking you acknowledge and agree to this cancellation policy.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border-2 border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedServiceId || !bookingDate || !timeSlot}
          className="flex-1 rounded-full bg-[#B08A5E] px-6 py-3 text-[#2E1F16] font-bold hover:bg-[#c39a6c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Processing…"
            : paymentMethod === "card"
            ? "Proceed to Payment →"
            : "Confirm Booking"}
        </button>
      </div>
    </div>
  );
}
