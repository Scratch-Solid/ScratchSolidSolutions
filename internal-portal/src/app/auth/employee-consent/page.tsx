"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validatePhone, validateSaIdNumber, validateSaPassport } from "@/lib/validation";

type Department = "Scratch" | "Solid" | "Trans";

export default function EmployeeConsentPage() {
  const [formData, setFormData] = useState({
    positionAppliedFor: "",
    fullName: "",
    idPassportNumber: "",
    contactNumber: "",
    applicantSignature: false,
    department: "Scratch" as Department,
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user has an existing contract submission
    const checkExistingContract = async () => {
      try {
        const storedConsent = localStorage.getItem("pendingConsent");
        if (storedConsent) {
          const consent = JSON.parse(storedConsent);
          // Check status via API
          const response = await fetch(`/api/pending-contracts/check?contactNumber=${consent.contactNumber}&idPassportNumber=${consent.idPassportNumber}`);
          if (response.ok) {
            const data = await response.json() as { status?: string };
            if (data.status === 'rejected') {
              setExistingStatus('rejected');
              setError('Your previous application was rejected. Please contact administration for more information.');
            } else if (data.status === 'approved') {
              setExistingStatus('approved');
              // Redirect to profile creation
              router.push('/auth/create-profile');
            }
          }
        }
      } catch (err) {
        console.error('Error checking existing contract:', err);
      }
    };
    checkExistingContract();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const { type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const generateUsername = (department: Department): string => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    for (let i = 0; i < 6; i++) {
      suffix += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return department + suffix;
  };

  const handleConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFieldErrors: Record<string, string> = {};
    setError("");

    // Validate required fields
    if (!formData.positionAppliedFor.trim()) {
      newFieldErrors.positionAppliedFor = "Position applied for is required";
    }
    if (!formData.fullName.trim()) {
      newFieldErrors.fullName = "Full name is required";
    }

    // Validate ID/Passport number
    if (!formData.idPassportNumber.trim()) {
      newFieldErrors.idPassportNumber = "ID or passport number is required";
    } else {
      const idPassportResult = formData.idPassportNumber.replace(/\D/g, '').length === 13
        ? validateSaIdNumber(formData.idPassportNumber)
        : validateSaPassport(formData.idPassportNumber);
      if (!idPassportResult.valid) {
        newFieldErrors.idPassportNumber = idPassportResult.errors.join(", ");
      }
    }

    // Validate phone number
    if (!formData.contactNumber.trim()) {
      newFieldErrors.contactNumber = "Contact number is required";
    } else {
      const phoneResult = validatePhone(formData.contactNumber);
      if (!phoneResult.valid) {
        newFieldErrors.contactNumber = phoneResult.errors.join(", ");
      }
    }

    if (!formData.applicantSignature) {
      newFieldErrors.applicantSignature = "Please confirm your signature.";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      const summary = Object.values(newFieldErrors).join(" · ");
      setError(summary);
      return;
    }

    setFieldErrors({});

    // Generate username for later use
    const generatedUsername = generateUsername(formData.department);

    // Store consent data for admin review
    const consentData = {
      ...formData,
      generatedUsername,
      submittedAt: new Date().toISOString(),
      status: "pending_approval",
    };

    try {
      // Submit to pending contracts API
      const response = await fetch("/api/pending-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consentData),
      });

      if (response.ok) {
        // Store in localStorage for later
        localStorage.setItem("pendingConsent", JSON.stringify(consentData));

        // Redirect to Consent Submitted page
        router.push("/auth/consent-submitted");
      } else {
        const data = await response.json() as { error?: string };
        setError(data.error || "Submission failed. Please review highlighted fields and try again.");
      }
    } catch (err) {
      setError("Network or server error. Please try again.");
    }
  };

  const handleDecline = () => {
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'linear-gradient(135deg, #f8fafc, #eef3ff)' }}>
      {/* Glassified consent form */}
      <div className="glass-panel max-w-3xl w-full p-8" style={{ boxShadow: '0 20px 50px rgba(9,23,42,0.12)' }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
            Employee Background Check Consent Form
          </p>
        </div>

        {error && (
          <div className="error-msg text-center font-semibold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleConsent} className="space-y-6">
          {/* Position Applied For */}
          <div>
            <label className="block text-sm font-bold mb-2">
              Position Applied For: __________________________
            </label>
            <input
              type="text"
              name="positionAppliedFor"
              value={formData.positionAppliedFor}
              onChange={handleChange}
              className="w-full"
              required
              placeholder="Enter position applied for"
            />
            {fieldErrors.positionAppliedFor && <p className="text-red-500 text-xs mt-1">{fieldErrors.positionAppliedFor}</p>}
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-sm font-bold mb-2">
              Department
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full"
              required
            >
              <option value="Scratch">Cleaning Team (Scratch)</option>
              <option value="Solid">Digital Team (Solid)</option>
              <option value="Trans">Transport Team (Trans)</option>
            </select>
          </div>

          {/* Applicant Details Section */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold mb-4">Applicant Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">
                  Full Name: __________________________
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full"
                  required
                  placeholder="Enter full name"
                />
                {fieldErrors.fullName && <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  ID / Passport Number: __________________________
                </label>
                <input
                  type="text"
                  name="idPassportNumber"
                  value={formData.idPassportNumber}
                  onChange={handleChange}
                  className="w-full"
                  required
                  placeholder="Enter ID (13 digits) or passport number"
                />
                {fieldErrors.idPassportNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.idPassportNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Contact Number: __________________________
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="w-full"
                  required
                  placeholder="+27 XX XXX XXXX or 0XX XXX XXXX"
                />
                {fieldErrors.contactNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.contactNumber}</p>}
              </div>
            </div>
          </div>

          {/* Consent & Authorization Section */}
          <div className="border-t pt-6 text-center">
            <h2 className="text-xl font-bold mb-4">Consent & Authorisation</h2>
            <div className="text-sm leading-relaxed space-y-2">
              <p className="text-left">
                I, the undersigned, hereby give written, informed consent to Scratch Solid Solutions to conduct background checks relevant to my application for employment.
              </p>
              <p className="text-left">
                I understand that these checks may include:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-left">
                <li>Identity verification</li>
                <li>Criminal record check (where relevant to the position)</li>
                <li>Reference and employment history checks</li>
              </ul>
              <p className="text-left">
                I acknowledge that:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-left">
                <li>All information will be processed in accordance with the Protection of Personal Information Act (POPIA)</li>
                <li>Information collected will only be used for employment-related purposes</li>
                <li>My personal information will be stored securely and confidentially</li>
                <li>I may request access to my information or withdraw consent in writing</li>
              </ul>
              <p className="font-semibold text-left">
                I confirm that the information I have provided is true and correct.
              </p>
            </div>
          </div>

          {/* Signature Section */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                name="applicantSignature"
                id="applicantSignature"
                checked={formData.applicantSignature}
                onChange={handleChange}
                className="mt-1 mr-3 w-5 h-5"
              />
              <div>
                <label htmlFor="applicantSignature" className="block text-sm font-bold">
                  Applicant Signature (Tick to confirm signature)
                </label>
                <p className="text-xs text-gray-600">By ticking this box, I confirm my electronic signature</p>
                {fieldErrors.applicantSignature && <p className="text-red-500 text-xs mt-1">{fieldErrors.applicantSignature}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Date: {new Date().toLocaleString()}
              </label>
              <p className="text-xs text-gray-600">Date and time captured by the system</p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Witness / Company Representative: Xolani Jason Tshaka
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              className="flex-1 primary-button"
            >
              Submit Consent
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="flex-1 secondary-button"
            >
              Decline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
