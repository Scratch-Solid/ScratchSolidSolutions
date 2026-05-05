"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Department = "Scratch" | "Solid" | "Trans";

export default function EmployeeConsentPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    positionAppliedFor: "",
    fullName: "",
    idPassportNumber: "",
    contactNumber: "",
    applicantSignature: false,
  });
  const [credentials, setCredentials] = useState({
    department: "Scratch" as Department,
    password: "",
    confirmPassword: "",
    generatedUsername: "",
  });
  const [error, setError] = useState("");
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
            const data = await response.json();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
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

  const handleConsent = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.positionAppliedFor || !formData.fullName || !formData.idPassportNumber || !formData.contactNumber) {
      setError("Please fill in all required fields");
      return;
    }

    if (!formData.applicantSignature) {
      setError("Please confirm your signature by ticking the checkbox");
      return;
    }

    // Generate username and move to step 2
    const username = generateUsername(credentials.department);
    setCredentials(prev => ({
      ...prev,
      generatedUsername: username
    }));
    setStep(2);
  };

  const handleDepartmentChange = (department: Department) => {
    const username = generateUsername(department);
    setCredentials(prev => ({
      ...prev,
      department,
      generatedUsername: username
    }));
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store consent data for admin review
    const consentData = {
      ...formData,
      department: credentials.department,
      generatedUsername: credentials.generatedUsername,
      password: credentials.password,
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
        setError("Failed to submit consent. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  const handleDecline = () => {
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Glassified consent form */}
      <div className="glass-panel max-w-2xl w-full">
        {step === 1 ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
              <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Employee Background Check Consent Form</p>
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
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      (ID / Passport Number: __________________________
                    </label>
                    <input
                      type="text"
                      name="idPassportNumber"
                      value={formData.idPassportNumber}
                      onChange={handleChange}
                      className="w-full"
                      required
                      placeholder="Enter ID or passport number"
                    />
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
                      placeholder="Enter contact number"
                    />
                  </div>
                </div>
              </div>

              {/* Consent & Authorization Section */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-bold mb-4">Consent & Authorisation</h2>
                <div className="text-sm leading-relaxed space-y-2">
                  <p>
                    I, the undersigned, hereby give written, informed consent to Scratch Solid Solutions to conduct background checks relevant to my application for employment.
                  </p>
                  <p>
                    I understand that these checks may include:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Identity verification</li>
                    <li>Criminal record check (where relevant to the position)</li>
                    <li>Reference and employment history checks</li>
                  </ul>
                  <p>
                    I acknowledge that:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>All information will be processed in accordance with the Protection of Personal Information Act (POPIA)</li>
                    <li>Information collected will only be used for employment‑related purposes</li>
                    <li>My personal information will be stored securely and confidentially</li>
                    <li>I may request access to my information or withdraw consent in writing</li>
                  </ul>
                  <p className="font-semibold">
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
                  I Consent
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
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Create Your Account</h1>
              <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Select your department and create your password</p>
            </div>

            {error && (
              <div className="error-msg text-center font-semibold mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleFinalSubmit} className="space-y-6">
              {/* Department Selection */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-bold mb-4">Select Department</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="department"
                      value="Scratch"
                      checked={credentials.department === "Scratch"}
                      onChange={() => handleDepartmentChange("Scratch")}
                      className="w-5 h-5"
                    />
                    <span className="text-lg">Cleaner</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="department"
                      value="Solid"
                      checked={credentials.department === "Solid"}
                      onChange={() => handleDepartmentChange("Solid")}
                      className="w-5 h-5"
                    />
                    <span className="text-lg">Digital</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="department"
                      value="Trans"
                      checked={credentials.department === "Trans"}
                      onChange={() => handleDepartmentChange("Trans")}
                      className="w-5 h-5"
                    />
                    <span className="text-lg">Transport</span>
                  </label>
                </div>
              </div>

              {/* Password Creation */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-bold mb-4">Create Password</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full"
                      required
                      placeholder="Create password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={credentials.confirmPassword}
                      onChange={(e) => setCredentials(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full"
                      required
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 secondary-button"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 primary-button"
                >
                  Complete Signup
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
