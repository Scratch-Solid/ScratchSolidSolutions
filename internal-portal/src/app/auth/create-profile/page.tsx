"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ firstName: "", lastName: "", residentialAddress: "", cellphone: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("pendingConsent")) router.push("/auth/employee-consent");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const consent = JSON.parse(localStorage.getItem("pendingConsent") || "{}");
    const res = await fetch("/api/auth/create-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, consentData: consent }),
    });
    if (res.ok) router.push("/auth/sign-contract");
    else setError("Failed to create profile");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-md w-full p-6">
        <h1 className="text-2xl font-bold mb-4">Create Profile</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full p-2 border rounded" required />
          <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full p-2 border rounded" required />
          <input name="residentialAddress" placeholder="Address" value={formData.residentialAddress} onChange={(e) => setFormData({...formData, residentialAddress: e.target.value})} className="w-full p-2 border rounded" required />
          <input name="cellphone" placeholder="Cellphone" value={formData.cellphone} onChange={(e) => setFormData({...formData, cellphone: e.target.value})} className="w-full p-2 border rounded" required />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Continue to Contract</button>
        </form>
      </div>
    </div>
  );
}
