"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LogoWatermark from '@/components/LogoWatermark';
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function AuthContent() {
  useSessionTimeout(false); // Disable timeout on auth page
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"individual" | "business">("individual");
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    name: "",
    email: "",
    address: "",
    businessName: "",
    registrationNumber: "",
    contactPerson: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoteContext, setQuoteContext] = useState<{ ref: string; service: string } | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);

  useEffect(() => {
    const quoteRef = searchParams.get('quote_ref');
    const service = searchParams.get('service');
    const type = searchParams.get('type');
    const nameParam = searchParams.get('name');
    const emailParam = searchParams.get('email');
    const phoneParam = searchParams.get('phone');

    if (quoteRef) {
      setQuoteContext({ ref: quoteRef, service: service || '' });
      setIsLogin(false);
    }
    if (type === 'business') setTab('business');
    else if (type === 'individual') setTab('individual');

    if (nameParam || emailParam || phoneParam) {
      setFormData(prev => ({
        ...prev,
        name: nameParam || prev.name,
        email: emailParam || prev.email,
        phone: phoneParam || prev.phone,
        contactPerson: nameParam || prev.contactPerson,
      }));
    }
  }, [searchParams]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Require consent for signup (POPIA compliance)
    if (!isLogin && !consentAccepted) {
      setError("You must accept the Privacy Policy and Terms of Service to create an account.");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const body = isLogin
        ? tab === "individual"
          ? { phone: formData.phone, password: formData.password }
          : { email: formData.email, password: formData.password }
        : tab === "individual"
        ? {
            type: "individual",
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            password: formData.password,
          }
        : {
            type: "business",
            businessName: formData.businessName,
            registration: formData.registrationNumber,
            name: formData.contactPerson,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            password: formData.password,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json() as {
          token: string; role: string; id: string;
          name?: string; email?: string; phone?: string; address?: string;
        };
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("userRole", result.role);
        localStorage.setItem("userId", String(result.id));
        localStorage.setItem("userName", result.name || "");
        localStorage.setItem("userEmail", result.email || "");
        localStorage.setItem("userPhone", result.phone || "");
        localStorage.setItem("userAddress", result.address || "");

        if (tab === "business") {
          router.push("/business-dashboard");
        } else {
          router.push("/client-dashboard");
        }
      } else {
        const errorData = await response.json() as { error?: string };
        setError(errorData.error || "Authentication failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4 font-sans">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          {isLogin ? "Sign In" : "Create Account"}
        </h1>

        {quoteContext && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
            <p className="font-semibold text-blue-700 mb-0.5">📋 Accepting quote {quoteContext.ref}</p>
            <p className="text-blue-600">{quoteContext.service} — Sign up or log in to complete your booking.</p>
          </div>
        )}

        <div className="flex mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-1 border border-white/20">
          <button
            onClick={() => setTab("individual")}
            className={`flex-1 py-2 rounded-md font-medium transition-colors ${
              tab === "individual" ? "bg-white text-blue-600 shadow" : "text-gray-600"
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setTab("business")}
            className={`flex-1 py-2 rounded-md font-medium transition-colors ${
              tab === "business" ? "bg-white text-blue-600 shadow" : "text-gray-600"
            }`}
          >
            Business
          </button>
        </div>

        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8 overflow-hidden">
          <LogoWatermark size="lg" />
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isLogin ? (
              <>
                {tab === "individual" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cellphone Number *</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required pattern="[0-9]{10}" placeholder="0730000000" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-500 mt-1">Format: 10 digits, e.g. 0730000000</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="business@example.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your password" />
                </div>
              </>
            ) : (
              <>
                {tab === "individual" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cellphone Number *</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required pattern="[0-9]{10}" placeholder="0730000000" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">Format: 10 digits, e.g. 0730000000</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                      <input type="text" name="address" value={formData.address} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123 Main St, City" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} required minLength={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min 8 characters" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                      <input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ABC Cleaning Services" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number *</label>
                      <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2024/123456/07" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person *</label>
                      <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="business@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cellphone Number (Optional)</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} pattern="[0-9]{10}" placeholder="0730000000" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">Format: 10 digits, e.g. 0730000000</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                      <input type="text" name="address" value={formData.address} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123 Main St, City" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                      <input type="password" name="password" value={formData.password} onChange={handleInputChange} required minLength={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min 8 characters" />
                    </div>
                  </>
                )}
              </>
            )}

            {isLogin && (
              <div className="text-right -mt-2">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot Password?</Link>
              </div>
            )}

            {!isLogin && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  required
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="consent" className="text-sm text-gray-600 leading-tight">
                  I accept the <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> and <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>. I consent to the collection and processing of my personal data in accordance with POPIA.
                </label>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center space-y-4">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 hover:underline font-semibold ml-2">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
          <p className="text-gray-600">
            <Link href="/" className="text-blue-600 hover:underline font-semibold">Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
