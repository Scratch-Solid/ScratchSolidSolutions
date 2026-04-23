"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState<"Scratch" | "Solid" | "Trans">("Scratch");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [generatedPaysheetCode, setGeneratedPaysheetCode] = useState("");
  const router = useRouter();

  const generatePaysheetCode = (dept: "Scratch" | "Solid" | "Trans"): string => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    for (let i = 0; i < 6; i++) {
      suffix += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return dept + suffix;
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDept = e.target.value as "Scratch" | "Solid" | "Trans";
    setDepartment(newDept);
    setGeneratedPaysheetCode(generatePaysheetCode(newDept));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Generate paysheet code if not already generated
    const paysheetCode = generatedPaysheetCode || generatePaysheetCode(department);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          department,
          paysheetCode,
          password,
          role: department === 'Scratch' ? 'cleaner' : department === 'Solid' ? 'digital' : 'transport'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      router.push("/auth/login?signup=success");
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Staff Sign Up</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSignup}>
          <div className="mb-4">
            <label htmlFor="fullName" className="block text-sm font-bold mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="department" className="block text-sm font-bold mb-2">
              Department
            </label>
            <select
              id="department"
              value={department}
              onChange={handleDepartmentChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Scratch">Cleaning Team (Scratch)</option>
              <option value="Solid">Digital Team (Solid)</option>
              <option value="Trans">Transport Team (Trans)</option>
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="paysheetCode" className="block text-sm font-bold mb-2">
              Paysheet Code (Auto-generated)
            </label>
            <input
              type="text"
              id="paysheetCode"
              value={generatedPaysheetCode || generatePaysheetCode(department)}
              readOnly
              className="w-full px-3 py-2 border rounded-md bg-gray-100 focus:outline-none"
              required
            />
            <p className="text-xs mt-1 text-gray-600">
              Your paysheet code will be your username for login
            </p>
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-bold mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full primary-button"
          >
            Sign Up
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
