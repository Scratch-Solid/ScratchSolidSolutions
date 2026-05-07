"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { validatePassword } from "@/lib/validation";

export default function CreateProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    residentialAddress: "",
    cellphone: "",
    password: "",
    confirmPassword: "",
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");
  const [useCamera, setUseCamera] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const pendingConsent = localStorage.getItem("pendingConsent");
    if (!pendingConsent) {
      router.push("/auth/employee-consent");
      return;
    }

    // Check if contract is approved
    const checkApproval = async () => {
      try {
        const consent = JSON.parse(pendingConsent);
        const response = await fetch(`/api/pending-contracts/check?contactNumber=${consent.contactNumber}&idPassportNumber=${consent.idPassportNumber}`);
        if (response.ok) {
          const data = await response.json() as { status?: string };
          if (data.status !== 'approved') {
            setError('Your application is still being reviewed or has been rejected.');
          }
        }
      } catch (err) {
        console.error('Error checking approval status:', err);
      }
    };
    checkApproval();

    // Cleanup camera stream on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [router]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setUseCamera(true);
    } catch (err) {
      setError("Could not access camera. Please use file upload instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
            setProfilePicture(file);
            setProfilePicturePreview(URL.createObjectURL(file));
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB.");
        return;
      }
      setProfilePicture(file);
      setProfilePicturePreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    const newFieldErrors: Record<string, string> = {};

    // Validate required fields
    if (!formData.firstName) newFieldErrors.firstName = "First name is required";
    if (!formData.lastName) newFieldErrors.lastName = "Last name is required";
    if (!formData.residentialAddress) newFieldErrors.residentialAddress = "Address is required";
    if (!formData.cellphone) newFieldErrors.cellphone = "Cellphone is required";

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newFieldErrors.password = passwordValidation.errors.join(", ");
    } else if (formData.password !== formData.confirmPassword) {
      newFieldErrors.confirmPassword = "Passwords do not match";
    }

    // Validate profile picture
    if (!profilePicture) {
      newFieldErrors.profilePicture = "Profile picture is required";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError("Please fix the errors above");
      setLoading(false);
      return;
    }

    try {
      const consent = JSON.parse(localStorage.getItem("pendingConsent") || "{}");

      // Convert profile picture to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const res = await fetch("/api/auth/create-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            profilePicture: base64String,
            consentData: consent,
          }),
        });

        if (res.ok) {
          // Clear pending consent and redirect to contract
          localStorage.removeItem("pendingConsent");
          router.push("/auth/sign-contract");
        } else {
          const data = await res.json() as { error?: string };
          setError(data.error || "Failed to create profile");
          setLoading(false);
        }
      };
      reader.readAsDataURL(profilePicture);
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="glass-panel max-w-lg w-full p-8">
        <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: 'var(--text-h)' }}>Create Your Profile</h1>
        <p className="text-center mb-6" style={{ color: 'var(--text)' }}>Complete your profile to continue</p>

        {error && (
          <div className="error-msg text-center font-semibold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold mb-4">Profile Picture</h2>
            
            {profilePicturePreview ? (
              <div className="mb-4">
                <img
                  src={profilePicturePreview}
                  alt="Profile Preview"
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProfilePicture(null);
                    setProfilePicturePreview("");
                  }}
                  className="mt-2 text-sm text-red-600 hover:underline mx-auto block"
                >
                  Remove Photo
                </button>
              </div>
            ) : useCamera ? (
              <div className="mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover rounded-lg"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 primary-button"
                  >
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 secondary-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full primary-button"
                >
                  📷 Take Photo with Camera
                </button>
                <div className="text-center text-gray-500">or</div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full"
                    id="profilePictureInput"
                  />
                  <label
                    htmlFor="profilePictureInput"
                    className="w-full secondary-button block text-center cursor-pointer"
                  >
                    📁 Upload Photo
                  </label>
                </div>
              </div>
            )}
            {fieldErrors.profilePicture && (
              <p className="text-red-500 text-xs mt-1 text-center">{fieldErrors.profilePicture}</p>
            )}
          </div>

          {/* Personal Information */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">First Name</label>
                <input
                  name="firstName"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full"
                  required
                />
                {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Last Name</label>
                <input
                  name="lastName"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full"
                  required
                />
                {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Residential Address</label>
                <input
                  name="residentialAddress"
                  placeholder="Enter residential address"
                  value={formData.residentialAddress}
                  onChange={handleChange}
                  className="w-full"
                  required
                />
                {fieldErrors.residentialAddress && <p className="text-red-500 text-xs mt-1">{fieldErrors.residentialAddress}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Cellphone Number</label>
                <input
                  name="cellphone"
                  type="tel"
                  placeholder="+27 XX XXX XXXX"
                  value={formData.cellphone}
                  onChange={handleChange}
                  className="w-full"
                  required
                />
                {fieldErrors.cellphone && <p className="text-red-500 text-xs mt-1">{fieldErrors.cellphone}</p>}
              </div>
            </div>
          </div>

          {/* Password Creation */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold mb-4">Create Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="Min 8 characters, uppercase, lowercase, number, special character"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full"
                  required
                />
                {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full"
                  required
                />
                {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full primary-button"
            disabled={loading}
          >
            {loading ? "Creating Profile..." : "Continue to Contract"}
          </button>
        </form>
      </div>
    </div>
  );
}
