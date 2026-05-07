"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContractPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    idPassportNumber: "",
    address: "",
    bank: "",
    accountNumber: "",
    cardholderName: "",
  });
  const [consentData, setConsentData] = useState<any>(null);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [contractContent, setContractContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch contract content from database
    const fetchContractContent = async () => {
      try {
        const response = await fetch('/api/admin/contract-content');
        if (response.ok) {
          const data = await response.json();
          setContractContent(data);
        }
      } catch (err) {
        console.error('Error fetching contract content:', err);
      } finally {
        setLoadingContent(false);
      }
    };
    fetchContractContent();

    async function checkApprovalStatus() {
      // Get consent data from localStorage
      const storedConsent = localStorage.getItem("pendingConsent");
      if (storedConsent) {
        const consent = JSON.parse(storedConsent);
        setConsentData(consent);
        setFormData(prev => ({
          ...prev,
          fullName: consent.fullName || "",
          idPassportNumber: consent.idPassportNumber || "",
        }));

        // Check approval status from API
        try {
          const response = await fetch("/api/pending-contracts");
          if (response.ok) {
            const contracts = await response.json() as any[];
            const userContract = contracts.find((c: any) => c.generatedUsername === consent.generatedUsername);
            if (userContract && userContract.status === "approved") {
              setApproved(true);
            }
          }
        } catch (err) {
          console.error("Failed to check approval status:", err);
        }
      } else {
        router.push("/auth/login");
      }

      // Get location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          },
          () => {
            setLocation("Location not captured");
          }
        );
      }

      setLoading(false);
    }
    checkApprovalStatus();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!approved) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
            <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Contract Pending Approval</p>
          </div>

          <div className="glass-card text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-4">Your application is being reviewed</h2>
            <p className="text-gray-600 mb-6">
              Your consent form has been submitted and is currently under review by our admin team. You will be able to access and sign your contract once approved.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please check back later or contact admin if you have any questions.
            </p>
          </div>

          <button
            onClick={() => router.push("/auth/login")}
            className="w-full mt-6 secondary-button"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSignClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmSign = async () => {
    setShowConfirm(false);
    await handleSubmit(new Event('submit') as any);
  };

  const handleQuit = () => {
    setShowConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store contract data with consent data
    const contractData = {
      ...consentData,
      ...formData,
      location,
      submittedAt: new Date().toISOString(),
      status: "signed",
    };
    
    try {
      // Submit to pending contracts API
      const response = await fetch("/api/pending-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractData),
      });

      if (response.ok) {
        // Clear localStorage
        localStorage.removeItem("pendingConsent");
        localStorage.removeItem("pendingContract");
        
        // Redirect to appropriate dashboard based on department
        const dashboardRoute = consentData.department === "Scratch" ? "/cleaner-dashboard" 
          : consentData.department === "Solid" ? "/digital-dashboard" 
          : "/transport-dashboard";
        router.push(dashboardRoute);
      } else {
        alert("Failed to submit contract. Please try again.");
      }
    } catch (err) {
      console.error("Failed to submit contract:", err);
      alert("An error occurred. Please try again.");
    }
  };

  const startDate = new Date().toLocaleDateString("en-ZA");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="glass-panel max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
            {loadingContent ? 'Loading...' : (contractContent?.title || 'Employment Agreement')}
          </p>
        </div>

        <div className="glass-card" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <h2 className="text-2xl font-bold mb-6 text-center">EMPLOYMENT AGREEMENT – CLEANING STAFF</h2>
          
          <div className="space-y-6 text-sm">
            <p className="font-semibold mb-4">This agreement is entered into between:</p>
            
            <div className="space-y-4">
              <div>
                <p className="font-bold mb-2">Employer:</p>
                <p>Company Name: {loadingContent ? 'Loading...' : (contractContent?.company_name || 'Scratch Solid Solutions')}</p>
              </div>

              <div>
                <p className="font-bold mb-2">Employee:</p>
                <div className="space-y-2">
                  <div>
                    <label className="block font-semibold mb-1">Full Name:</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">ID / Passport Number:</label>
                    <input
                      type="text"
                      name="idPassportNumber"
                      value={formData.idPassportNumber}
                      onChange={handleChange}
                      className="w-full"
                      required
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Address:</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full"
                      required
                      placeholder="Enter your address"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {loadingContent ? (
                <p>Loading contract terms...</p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: (contractContent?.terms || '').replace(/\n/g, '<br/>') }} />
              )}
            </div>

            <div className="mt-8 pt-4 border-t">
              <p className="font-bold mb-2">SIGNED AT {location} ON {startDate}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="font-bold mb-2">Employer:</p>
                  <p>Xolani Jason Tshaka</p>
                  <p className="mt-2">Signature: ____________________</p>
                </div>
                <div>
                  <p className="font-bold mb-2">Employee:</p>
                  <p>{formData.fullName}</p>
                  <p className="mt-2">Signature: ____________________</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="flex-1 secondary-button"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSignClick}
            className="flex-1 primary-button"
          >
            Sign Contract
          </button>
        </div>
      </div>

      {/* Sign Confirmation Popup */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel max-w-md w-full p-8">
            <h3 className="text-2xl font-bold mb-4 text-center">Confirm Contract Signing</h3>
            <p className="text-center mb-6">Are you sure you want to sign this employment agreement?</p>
            
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm">I have read and agree to the terms of this employment agreement</span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleQuit}
                className="flex-1 secondary-button"
                disabled={!confirmed}
              >
                Quit
              </button>
              <button
                onClick={handleConfirmSign}
                className="flex-1 primary-button"
                disabled={!confirmed}
              >
                Yes, Sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
