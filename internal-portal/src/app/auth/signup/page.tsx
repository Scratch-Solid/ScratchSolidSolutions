"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffApplyPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState<"digital" | "transport">("digital");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: department,
          name: fullName,
          email,
          phone,
          message,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Application failed');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-3">Application submitted</h1>
          <p className="text-sm text-stone-600 mb-6">
            Thanks, {fullName || "there"}! Your application to join the {department === 'digital' ? 'Digital' : 'Transportation'} team is now
            pending review. You'll receive an email with your paysheet code and a temporary password once an admin approves it.
          </p>
          <a href="/auth/login" className="text-[#2E1F16] hover:underline font-medium">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-1">Apply to join the team</h1>
        <p className="text-sm text-stone-500 text-center mb-6">
          Submit your details below - an admin reviews every application before an account is created.
        </p>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleApply}>
          <div className="mb-4">
            <label htmlFor="fullName" className="block text-sm font-bold mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-bold mb-2">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="department" className="block text-sm font-bold mb-2">
              Team
            </label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value as "digital" | "transport")}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
              required
            >
              <option value="digital">Digital Team</option>
              <option value="transport">Transportation Team</option>
            </select>
          </div>
          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-bold mb-2">
              Anything else we should know? <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
              placeholder="Relevant experience, availability, etc."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full primary-button disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
        <div className="mt-4 text-center space-y-1">
          <p className="text-xs text-stone-500">
            Looking to join the cleaning team? <a href="/signup/cleaner" className="text-[#2E1F16] hover:underline font-medium">Apply here</a> instead.
          </p>
          <a href="/auth/login" className="block text-[#2E1F16] hover:underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
