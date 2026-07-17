"use client";

import { useState } from "react";
import Link from "next/link";

export default function BusinessSignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    businessName: "",
    registration: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          type: "business",
          role: "business",
          business_info: {
            name: formData.businessName,
            registration: formData.registration,
          },
        }),
      });

      if (response.ok) {
        window.location.href = "/auth?message=verify_email";
      } else {
        const error = await response.json() as { error?: string };
        setError(error.error || "Signup failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-[#F7F2EA] py-8 sm:py-16 px-2 sm:px-4 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-center text-[#2E1F16] mb-6 sm:mb-8" style={{ fontFamily: "Georgia, serif" }}>
          Business Registration
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-600">{error}</p>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E9E0D3] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                  placeholder="Contact Person Name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                  placeholder="Your Business Name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Registration Number
                </label>
                <input
                  type="text"
                  name="registration"
                  value={formData.registration}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                  placeholder="e.g., 2020/123456/7890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                  placeholder="business@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                  placeholder="+27 12 345 6789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Business Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                  placeholder="123 Business St, City, Province"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                  placeholder="Create a strong password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-[#B08A5E] px-8 py-3 text-lg font-semibold text-[#2E1F16] shadow-lg hover:bg-[#c39a6c] transition-colors"
              >
                Create Business Account
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-stone-600">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-[#8a6a45] hover:underline font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
