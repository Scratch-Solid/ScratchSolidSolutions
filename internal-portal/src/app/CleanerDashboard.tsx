// CleanerDashboard.tsx
// Next.js page for cleaner dashboard (status, profile, earnings, tasks)

"use client";

import React, { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DashboardLayout from "@/components/DashboardLayout";
import TrainingModuleCard from "@/components/TrainingModuleCard";
import QuizInterface from "@/components/QuizInterface";
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';

export default function CleanerDashboard() {
  useSessionTimeout(true);
  const [cleaner, setCleaner] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTile, setActiveTile] = useState("profile");
  const [editingProfile, setEditingProfile] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [profileData, setProfileData] = useState({
    profilePicture: "",
    firstName: "",
    lastName: "",
    address: "",
    cellphoneNumber: "",
    taxNumber: "",
    emergencyContact1: { name: "", number: "" },
    emergencyContact2: { name: "", number: "" }
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'profile-pictures');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json() as { publicUrl: string };
      setProfileData(prev => ({ ...prev, profilePicture: data.publicUrl }));
      return data.publicUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      alert('Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };
  const [username, setUsername] = useState("");
  const [cleanerStatus, setCleanerStatus] = useState('idle');
  const [cleanerId, setCleanerId] = useState<number | null>(null);
  const [taskHorizonFilter, setTaskHorizonFilter] = useState<'7-day' | 'all'>('7-day');
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [lastLocationPing, setLastLocationPing] = useState<Date | null>(null);
  const [kpiScore, setKpiScore] = useState(0);
  const [kpiBreakdown, setKpiBreakdown] = useState<{ punctuality: number; quality: number; communication: number } | null>(null);
  const [salaryData, setSalaryData] = useState<{ grossEarnings: number; uifDeductions: number; takeHomePay: number; payPeriod: string } | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Training state
  const [trainingModules, setTrainingModules] = useState<any[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<any>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(false);

  useEffect(() => {
    async function fetchCleanerAndTasks() {
      setLoading(true);
      try {
        // Get username from localStorage
        const storedUsername = localStorage.getItem("username");
        const storedUserId = localStorage.getItem("user_id");
        if (storedUsername) {
          setUsername(storedUsername);
          const mustChange = localStorage.getItem('mustChangePassword') === 'true';
          setMustChangePassword(mustChange);

          // Fetch cleaner profile
          const profileRes = await fetch(`/api/cleaner-profile?username=${storedUsername}`);
          if (profileRes.ok) {
            const profile = await profileRes.json() as any;
            setProfileData(profile as any);
            setCleanerId(profile.user_id || parseInt(storedUserId || '1'));
          }
        }

        // Fetch cleaner status
        if (storedUserId) {
          const statusRes = await fetch(`/api/cleaner-status?cleaner_id=${storedUserId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json() as any;
            setCleanerStatus(statusData.status || 'idle');
          }

          // Fetch task completions for earnings
          const earningsRes = await fetch(`/api/cleaner-earnings?cleaner_id=${storedUserId}`);
          if (earningsRes.ok) {
            const earningsData = await earningsRes.json() as any[];
            const totalEarnings = earningsData.reduce((sum: number, item: any) => sum + (item.earnings || 0), 0);
            setCleaner(prev => prev ? { ...prev, totalEarnings, completedJobs: earningsData.length } : prev);
          }

            // Fetch live KPI score
          const kpiRes = await fetch(`/api/v2/staff/kpi-score?staffId=${storedUserId}`);
          if (kpiRes.ok) {
            const kpiData = await kpiRes.json() as any;
            setKpiScore(Math.round((kpiData.averageScore ?? 0) * 10)); // convert 0-10 → 0-100
            setKpiBreakdown({
              punctuality:   Math.round((kpiData.punctuality   ?? 0) * 10),
              quality:       Math.round((kpiData.quality       ?? 0) * 10),
              communication: Math.round((kpiData.communication ?? 0) * 10),
            });
          }

          // Fetch bookings for tasks
          const bookingsRes = await fetch(`/api/bookings?cleaner_id=${storedUserId}`);
          if (bookingsRes.ok) {
            const bookingsData = await bookingsRes.json() as any[];
            setTasks(bookingsData.map((b: any) => ({
              id: b.id,
              customer: b.client_name,
              date: b.booking_date,
              time: b.booking_time,
              address: b.location,
              status: b.status
            })));
          }

          // Fetch training data
          const modulesRes = await fetch('/api/training/modules');
          if (modulesRes.ok) {
            const modules = await modulesRes.json() as any[];
            setTrainingModules(modules);
          }

          const progressRes = await fetch(`/api/training/current-state?user_id=${storedUserId}`);
          if (progressRes.ok) {
            const progressData = await progressRes.json() as { progress: any };
            setTrainingProgress(progressData.progress);
          }
        }

        // Build cleaner profile from real API data
        const totalEarnings = (cleaner as any)?.totalEarnings ?? 0;
        const completedJobs = (cleaner as any)?.completedJobs ?? 0;
        setCleaner({
          id: cleanerId,
          name: `${profileData.firstName} ${profileData.lastName}`.trim() || username || "Cleaner",
          email: "",
          rating: 0,
          totalEarnings,
          completedJobs,
        });

        if (!storedUserId && tasks.length === 0) {
          setTasks([]);
        }
      } catch (err) {
        setError((err as any)?.error || (err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchCleanerAndTasks();
  }, []);

  // Helper function to get quiz questions for each module
  const getModuleQuestions = (moduleId: number) => {
    // Quiz questions from the specification document
    const questions: Record<number, any[]> = {
      1: [
        {
          id: 1,
          question: "What is Scratch Solid Solutions' primary operational selling point regarding how we handle client bookings?",
          options: [
            "We use the cheapest chemicals available on the market.",
            "Our Transparency Policy, driven by real-time staff geolocation tracking and client dashboard visibility.",
            "We clean spaces without using any cloths."
          ],
          correctAnswer: 1
        },
        {
          id: 2,
          question: "Complete the Scratch Solid Solutions philosophy: \"Every smudge left behind is a scratch on our reputation; every gleaming surface is a...\"",
          options: [
            "...reason to ask for a tip.",
            "...signature of our excellence.",
            "...job done fast."
          ],
          correctAnswer: 1
        },
        {
          id: 3,
          question: "You are cleaning a client's master bathroom. What color microfiber cloth is permitted to wipe down the hand basins and polished silver faucets?",
          options: ["Green", "Red", "Orange"],
          correctAnswer: 2
        }
      ],
      2: [
        {
          id: 4,
          question: "When completing a routine hard-floor damp mop in a residential lounge, what is the correct spatial path to take?",
          options: [
            "Start directly at the doorway entry point and work your way inward.",
            "Start in the absolute furthest corner of the room and mop backward toward the exit door so you never leave footprints.",
            "Mop in circular shapes starting from the middle of the room out."
          ],
          correctAnswer: 1
        },
        {
          id: 5,
          question: "During a standard Maintenance Clean package, what is our operational rule regarding the client's kitchen appliances?",
          options: [
            "Open them up, take out all internal components, and scrub them down completely.",
            "Clean and polish the external surfaces and handles perfectly; do not execute an intensive interior teardown.",
            "Leave them entirely untouched to avoid fingerprints."
          ],
          correctAnswer: 1
        }
      ],
      3: [
        {
          id: 6,
          question: "What is the correct protocol when tasked with executing a Deep Clean on a residential refrigerator?",
          options: [
            "Spray disinfectant around food containers without moving them.",
            "Temporarily extract all contents safely, wash all interior shelves and drawers with food-safe sanitizer, dry them, and put items back neatly.",
            "Unplug the appliance and leave the door open."
          ],
          correctAnswer: 1
        },
        {
          id: 7,
          question: "Which of the following tasks is a key differentiator that must be performed during a Deep Clean compared to a Maintenance Clean?",
          options: [
            "Making beds and straightening living room cushions.",
            "Deep-cleaning structural skirting boards, door frames, light switches, and internal appliance walls.",
            "Emptying the main kitchen trash can."
          ],
          correctAnswer: 1
        }
      ],
      4: [
        {
          id: 8,
          question: "You are cleaning a corporate workspace and encounter a desk covered in loose client files, notes, and documents. What is your standard procedure?",
          options: [
            "Stack the files neatly by size, wipe down the entire desk, and put the files back.",
            "Do not move, shift, or touch any of the paperwork. Clean around the visible open desk areas only.",
            "Put all loose papers into a desk drawer to keep the surface clean."
          ],
          correctAnswer: 1
        },
        {
          id: 9,
          question: "What color cloth should be deployed to dust delicate electronic computer components, network servers, and keypads in an office environment?",
          options: ["Green Cloth", "Red Cloth", "Yellow Cloth"],
          correctAnswer: 2
        }
      ],
      5: [
        {
          id: 10,
          question: "What action defines the absolute first step of the Scratch Solid Solutions Final Walkthrough protocol?",
          options: [
            "Spraying the signature lemon room spray near the entry door.",
            "Standing in the center of the room and conducting a slow, 360-degree eye-level visual check from top to bottom for any hidden details or missed smudges.",
            "Locking the front door and walking away."
          ],
          correctAnswer: 1
        },
        {
          id: 11,
          question: "Where and when should our distinct signature lemon-scented room spray be applied?",
          options: [
            "Heavily over fabric curtains and beds at the start of the cleaning shift.",
            "Applied as a light mist in the ambient air near the main exit door right as you complete your final walkthrough and leave the site.",
            "Applied as a heavy spray throughout the entire space."
          ],
          correctAnswer: 1
        }
      ]
    };
    return questions[moduleId] || [];
  };

  // Helper function to generate certificate PDF
  const generateCertificate = (certHash: string, completionDate: string) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Background color
    doc.setFillColor(245, 245, 250);
    doc.rect(0, 0, 297, 210, 'F');

    // Border
    doc.setDrawColor(38, 103, 255);
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190);

    // Header
    doc.setFontSize(32);
    doc.setTextColor(38, 103, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificate of Completion', 148.5, 40, { align: 'center' });

    // Subtitle
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Scratch Solid Solutions Training Program', 148.5, 55, { align: 'center' });

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(50, 65, 247, 65);

    // Recipient name
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('This is to certify that', 148.5, 85, { align: 'center' });

    doc.setFontSize(28);
    doc.setTextColor(38, 103, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`${profileData.firstName} ${profileData.lastName}`, 148.5, 100, { align: 'center' });

    // Completion text
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('has successfully completed all 5 training modules of the', 148.5, 120, { align: 'center' });
    doc.text('Scratch Solid Solutions Cleaner Training Program', 148.5, 130, { align: 'center' });

    // Date
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text(`Completed on: ${completionDate}`, 148.5, 150, { align: 'center' });

    // Certificate ID
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Certificate ID: ${certHash}`, 148.5, 165, { align: 'center' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Scratch Solid Solutions - Excellence in Every Clean', 148.5, 190, { align: 'center' });

    // Save the PDF
    doc.save(`training-certificate-${certHash}.pdf`);
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Update failed");
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === parseInt(bookingId) ? { ...task, status } : task
        )
      );
    } catch (err) {
      console.error("Failed to update booking status:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  const updateCleanerStatus = async (newStatus: string) => {
    if (!cleanerId) {
      alert("Cleaner ID not found");
      return;
    }

    try {
      // Get GPS location
      let gps_lat: number | undefined;
      let gps_long: number | undefined;

      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        gps_lat = position.coords.latitude;
        gps_long = position.coords.longitude;
      }

      const response = await fetch("/api/cleaner-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaner_id: cleanerId,
          status: newStatus,
          gps_lat,
          gps_long
        }),
      });

      if (response.ok) {
        setCleanerStatus(newStatus);
        alert(`Status updated to ${newStatus}`);
      } else {
        const error = await response.json() as any;
        alert(`Failed to update status: ${error?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Failed to update cleaner status:", err);
      const msg = (err as any)?.error || (err as Error)?.message || 'An error occurred while updating status';
      alert(msg);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/cleaner-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          address: profileData.address,
          cellphone: profileData.cellphoneNumber,
          tax_number: profileData.taxNumber,
          emergency_contact1_name: profileData.emergencyContact1.name,
          emergency_contact1_phone: profileData.emergencyContact1.number,
          emergency_contact2_name: profileData.emergencyContact2.name,
          emergency_contact2_phone: profileData.emergencyContact2.number,
          profile_picture: profileData.profilePicture,
        }),
      });

      if (response.ok) {
        alert("Profile updated successfully!");
        setEditingProfile(false);
      } else {
        alert("Failed to update profile. Please try again.");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("An error occurred. Please try again.");
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    window.location.href = '/auth/login';
  };

  if (loading) return <DashboardLayout title="Cleaner Dashboard" role="cleaner"><div className="glass-panel text-center" style={{ color: 'var(--text)' }}>Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout title="Cleaner Dashboard" role="cleaner"><div className="error-msg">{error}</div></DashboardLayout>;
  if (!cleaner) return <DashboardLayout title="Cleaner Dashboard" role="cleaner"><div className="glass-panel text-center" style={{ color: 'var(--text)' }}>No data found.</div></DashboardLayout>;

  return (
    <DashboardLayout title="Cleaner Dashboard" role="cleaner">
      {mustChangePassword && (
        <div className="mb-4 glass-panel" style={{ background: 'rgba(254, 249, 195, 0.9)', borderColor: 'rgba(234, 179, 8, 0.4)' }}>
          <div className="font-bold" style={{ color: '#854d0e' }}>Action required</div>
          <div style={{ color: '#854d0e' }}>Please update your password to continue using the portal.</div>
          <button className="mt-2 primary-button" onClick={() => window.location.href = '/auth/change-password'}>
            Change Password
          </button>
        </div>
      )}
      {/* Tile Navigation */}
      <div className="mb-6 flex space-x-2 border-b pb-2" style={{ borderColor: 'rgba(12, 37, 74, 0.12)' }}>
        <button
          onClick={() => setActiveTile("profile")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "profile" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "profile" ? '#09172a' : '#0e223a' }}
        >
          Personal Details
        </button>
        <button
          onClick={() => setActiveTile("status")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "status" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "status" ? '#09172a' : '#0e223a' }}
        >
          Status
        </button>
        <button
          onClick={() => setActiveTile("tasks")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "tasks" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "tasks" ? '#09172a' : '#0e223a' }}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTile("earnings")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "earnings" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "earnings" ? '#09172a' : '#0e223a' }}
        >
          Earnings
        </button>
        <button
          onClick={() => setActiveTile("performance")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "performance" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "performance" ? '#09172a' : '#0e223a' }}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTile("training")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "training" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "training" ? '#09172a' : '#0e223a' }}
        >
          Training
        </button>
        <button
          onClick={() => setActiveTile("geolocation")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "geolocation" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "geolocation" ? '#09172a' : '#0e223a' }}
        >
          Geolocation
        </button>
      </div>

      {activeTile === "profile" && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-h)' }}>Personal Details</h3>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 text-sm rounded border transition-all"
              style={{ color: 'var(--text)', borderColor: 'rgba(12, 37, 74, 0.12)' }}
            >
              {editingProfile ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Profile Picture</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleImageUpload(file);
                    }
                  }}
                  className="w-full"
                  disabled={uploadingImage}
                />
                {uploadingImage && <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>Uploading image...</p>}
                {profileData.profilePicture && (
                  <img 
                    src={profileData.profilePicture} 
                    alt="Profile" 
                    className="rounded-full border mt-2" 
                    style={{ 
                      borderColor: 'var(--border)',
                      width: '48px',
                      height: '48px',
                      objectFit: 'cover'
                    }} 
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Address</label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Cellphone Number</label>
                <input
                  type="tel"
                  value={profileData.cellphoneNumber}
                  onChange={(e) => setProfileData(prev => ({ ...prev, cellphoneNumber: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Tax Number</label>
                <input
                  type="text"
                  value={profileData.taxNumber}
                  onChange={(e) => setProfileData(prev => ({ ...prev, taxNumber: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Emergency Contact 1 - Name</label>
                <input
                  type="text"
                  value={profileData.emergencyContact1.name}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact1: { ...prev.emergencyContact1, name: e.target.value }
                  }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Emergency Contact 1 - Number</label>
                <input
                  type="tel"
                  value={profileData.emergencyContact1.number}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact1: { ...prev.emergencyContact1, number: e.target.value }
                  }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Emergency Contact 2 - Name</label>
                <input
                  type="text"
                  value={profileData.emergencyContact2.name}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact2: { ...prev.emergencyContact2, name: e.target.value }
                  }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Emergency Contact 2 - Number</label>
                <input
                  type="tel"
                  value={profileData.emergencyContact2.number}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact2: { ...prev.emergencyContact2, number: e.target.value }
                  }))}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                className="w-full primary-button"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {profileData.profilePicture && (
                  <img 
                    src={profileData.profilePicture} 
                    alt="Profile" 
                    className="rounded-full border" 
                    style={{ 
                      borderColor: 'var(--border)',
                      width: '48px',
                      height: '48px',
                      objectFit: 'cover'
                    }} 
                  />
                )}
                <div>
                  <div className="text-xl font-bold" style={{ color: 'var(--text-h)' }}>{profileData.firstName} {profileData.lastName}</div>
                  <div className="text-sm" style={{ color: 'var(--text-light)' }}>@{username}</div>
                </div>
              </div>
              <div style={{ color: 'var(--text)' }}><b>Address:</b> {profileData.address || "Not provided"}</div>
              <div style={{ color: 'var(--text)' }}><b>Cellphone:</b> {profileData.cellphoneNumber || "Not provided"}</div>
              <div style={{ color: 'var(--text)' }}><b>Tax Number:</b> {profileData.taxNumber || "Not provided"}</div>
              <div style={{ color: 'var(--text)' }}><b>Emergency Contact 1:</b> {profileData.emergencyContact1.name || "Not provided"} - {profileData.emergencyContact1.number || "Not provided"}</div>
              <div style={{ color: 'var(--text)' }}><b>Emergency Contact 2:</b> {profileData.emergencyContact2.name || "Not provided"} - {profileData.emergencyContact2.number || "Not provided"}</div>
            </div>
          )}
        </div>
      )}

      {activeTile === "status" && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Current Status</h3>
          <div className="mb-4">
            <span className={`badge ${
              cleanerStatus === 'idle' ? 'badge-info' :
              cleanerStatus === 'on_way' ? 'badge-warning' :
              cleanerStatus === 'arrived' ? 'badge-warning' :
              cleanerStatus === 'completed' ? 'badge-success' :
              'badge-info'
            }`} style={{ padding: '12px 24px', fontSize: '1rem' }}>
              {cleanerStatus === 'idle' ? 'Idle' :
               cleanerStatus === 'on_way' ? 'On the Way' :
               cleanerStatus === 'arrived' ? 'Arrived' :
               cleanerStatus === 'completed' ? 'Completed' : 'Unknown'}
            </span>
          </div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Update Status</h4>
          <div className="space-y-2">
            <button
              onClick={() => updateCleanerStatus('idle')}
              disabled={cleanerStatus === 'idle'}
              className="secondary-button w-full"
              style={{ opacity: cleanerStatus === 'idle' ? 0.5 : 1 }}
            >
              Set Idle
            </button>
            <button
              onClick={() => updateCleanerStatus('on_way')}
              disabled={cleanerStatus === 'on_way'}
              className="primary-button w-full"
              style={{ opacity: cleanerStatus === 'on_way' ? 0.5 : 1 }}
            >
              On the Way
            </button>
            <button
              onClick={() => updateCleanerStatus('arrived')}
              disabled={cleanerStatus === 'arrived'}
              className="primary-button w-full"
              style={{ opacity: cleanerStatus === 'arrived' ? 0.5 : 1 }}
            >
              Arrived
            </button>
            <button
              onClick={() => updateCleanerStatus('completed')}
              disabled={cleanerStatus === 'completed'}
              className="primary-button w-full"
              style={{ opacity: cleanerStatus === 'completed' ? 0.5 : 1 }}
            >
              Completed
            </button>
          </div>
        </div>
      )}

      {activeTile === "tasks" && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-h)' }}>Tasks</h3>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button
                onClick={() => setTaskHorizonFilter('7-day')}
                className={`tab ${taskHorizonFilter === '7-day' ? 'active' : ''}`}
              >
                7-Day Horizon
              </button>
              <button
                onClick={() => setTaskHorizonFilter('all')}
                className={`tab ${taskHorizonFilter === 'all' ? 'active' : ''}`}
              >
                All Tasks
              </button>
            </div>
          </div>
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text-light)' }}>No tasks assigned.</p>
          ) : (
            <ul className="space-y-2">
              {tasks
                .filter((task: any) => {
                  if (taskHorizonFilter === 'all') return true;
                  const taskDate = new Date(task.date);
                  const sevenDaysFromNow = new Date();
                  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                  return taskDate <= sevenDaysFromNow && taskDate >= new Date();
                })
                .map((task: any) => (
                <li key={task.id} className="glass-card">
                  <div style={{ color: 'var(--text)' }}><b style={{ color: 'var(--text-h)' }}>Customer:</b> {task.customer}</div>
                  <div style={{ color: 'var(--text)' }}><b style={{ color: 'var(--text-h)' }}>Date:</b> {task.date}</div>
                  <div style={{ color: 'var(--text)' }}><b style={{ color: 'var(--text-h)' }}>Time:</b> {task.time}</div>
                  <div style={{ color: 'var(--text)' }}><b style={{ color: 'var(--text-h)' }}>Address:</b> {task.address}</div>
                  <div style={{ color: 'var(--text)' }}><b style={{ color: 'var(--text-h)' }}>Status:</b> <span className={`badge badge-info`}>{task.status}</span></div>
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => updateBookingStatus(task.id.toString(), 'completed')}
                      className="primary-button mt-2"
                      style={{ padding: '8px 16px', fontSize: '0.875rem', background: 'var(--success)' }}
                    >
                      Mark Complete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTile === "earnings" && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-h)' }}>Earnings</h3>

          {/* Task earnings summary */}
          <div className="stats-card">
            <div className="stats-value">R{(cleaner as any)?.totalEarnings || 0}</div>
            <div className="stats-label">Total Task Earnings</div>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-light)' }}>{(cleaner as any)?.completedJobs || 0} jobs completed</p>
          </div>

          {/* Salary Preview */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold" style={{ color: 'var(--text-h)' }}>Estimated Salary Preview</h4>
              <button
                onClick={async () => {
                  const userId = localStorage.getItem('user_id');
                  if (!userId) return;
                  setSalaryLoading(true);
                  try {
                    const res = await fetch(`/api/v2/staff/salary-preview?staffId=${userId}`);
                    if (res.ok) {
                      const data = await res.json() as any;
                      setSalaryData(data);
                    }
                  } catch (e) {
                    console.error('Salary fetch error', e);
                  } finally {
                    setSalaryLoading(false);
                  }
                }}
                className="secondary-button"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                {salaryLoading ? 'Loading…' : 'View Salary'}
              </button>
            </div>

            {salaryData ? (
              <div className="glass-card space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-light)' }}>Pay Period</span>
                  <span className="font-medium" style={{ color: 'var(--text-h)' }}>{salaryData.payPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text)', opacity: 0.7 }}>Gross Earnings</span>
                  <span className="font-medium" style={{ color: 'var(--text-h)' }}>R{salaryData.grossEarnings?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text)', opacity: 0.7 }}>UIF Deduction</span>
                  <span className="font-medium text-red-500">- R{salaryData.uifDeductions?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-bold" style={{ color: 'var(--text-h)' }}>Take-Home Pay</span>
                  <span className="text-xl font-bold" style={{ color: 'var(--success)' }}>R{salaryData.takeHomePay?.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="glass-card text-center">
                <p className="text-sm" style={{ color: 'var(--text-light)' }}>Click "View Salary" to load your estimated pay slip from payroll.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTile === "performance" && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Performance Metrics</h3>
          <div className="space-y-4">
            {/* KPI Score bar */}
            <div className="glass-card">
              <div className="flex justify-between items-center mb-2">
                <span style={{ color: 'var(--text)' }}>Overall KPI Score</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{kpiScore}/100</span>
              </div>
              <div className="progress-bar mb-3">
                <div className="progress-fill" style={{ width: `${kpiScore}%` }}></div>
              </div>
              {kpiBreakdown && (
                <div className="responsive-grid grid-cols-3 text-xs">
                  {(['punctuality', 'quality', 'communication'] as const).map(key => (
                    <div key={key} className="text-center">
                      <div style={{ color: 'var(--text-light)', textTransform: 'capitalize' }}>{key}</div>
                      <div className="font-semibold" style={{ color: 'var(--text-h)' }}>{kpiBreakdown[key]}/100</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 13th Check Eligibility */}
            <div className={`glass-card ${
              kpiScore >= 80
                ? 'border-green-500/40'
                : 'border-yellow-500/40'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{kpiScore >= 80 ? '🏆' : '📈'}</span>
                <div>
                  <div className="font-semibold" style={{ color: kpiScore >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                    {kpiScore >= 80 ? 'Eligible for 13th Cheque Bonus' : 'Not yet eligible for 13th Cheque'}
                  </div>
                  <div className="text-sm" style={{ color: kpiScore >= 80 ? 'var(--success)' : 'var(--warning)', opacity: 0.8 }}>
                    {kpiScore >= 80
                      ? 'Your KPI score qualifies you for the annual performance bonus.'
                      : `Reach a score of 80/100 to qualify. Current: ${kpiScore}/100.`}
                  </div>
                </div>
              </div>
            </div>

            {/* Job counts */}
            <div className="responsive-grid grid-cols-2">
              <div className="stats-card">
                <div style={{ color: 'var(--text-light)' }}>Completed (7-day)</div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-h)' }}>
                  {tasks.filter((t: any) => t.status === 'completed').length}
                </div>
              </div>
              <div className="stats-card">
                <div style={{ color: 'var(--text-light)' }}>Pending (7-day)</div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-h)' }}>
                  {tasks.filter((t: any) => t.status !== 'completed').length}
                </div>
              </div>
            </div>

            {/* Current status badge */}
            <div className="glass-card">
              <div style={{ color: 'var(--text-light)' }}>Current Status</div>
              <div className={`mt-1 badge ${
                cleanerStatus === 'idle'      ? 'badge-info' :
                cleanerStatus === 'on_way'    ? 'badge-warning' :
                cleanerStatus === 'arrived'   ? 'badge-warning' :
                cleanerStatus === 'completed' ? 'badge-success' :
                'badge-info'
              }`}>
                {cleanerStatus === 'idle'      ? 'Idle' :
                 cleanerStatus === 'on_way'    ? 'On the Way' :
                 cleanerStatus === 'arrived'   ? 'Arrived' :
                 cleanerStatus === 'completed' ? 'Completed' : 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTile === "training" && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Training Modules</h3>
          
          {trainingProgress && (
            <div className="mb-6 glass-card">
              <div className="flex justify-between items-center">
                <div>
                  <div style={{ color: 'var(--text-light)' }}>Training Status</div>
                  <div className={`mt-1 badge ${
                    trainingProgress.training_status === 'Completed' 
                      ? 'badge-success' 
                      : 'badge-info'
                  }`}>
                    {trainingProgress.training_status === 'Completed' ? 'Completed' : 'In Progress'}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ color: 'var(--text-light)' }}>Current Module</div>
                  <div className="font-semibold" style={{ color: 'var(--text-h)' }}>
                    Day {trainingProgress.current_module_id} of 5
                  </div>
                </div>
              </div>
            </div>
          )}

          {showQuiz && activeModuleId ? (
            <QuizInterface
              moduleId={activeModuleId}
              questions={getModuleQuestions(activeModuleId)}
              onComplete={async (score, total) => {
                const userId = localStorage.getItem('user_id');
                if (!userId) return;
                
                const response = await fetch('/api/training/submit-quiz', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId,
                    moduleId: activeModuleId,
                    totalQuestions: total,
                    correctAnswers: score
                  })
                });
                
                if (response.ok) {
                  const result = await response.json() as { status: string; message?: string; certHash?: string; completionDate?: string };
                  if (result.status === 'certified') {
                    // Trigger confetti celebration
                    confetti({
                      particleCount: 150,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ['#2667FF', '#00C853', '#FFD600', '#FF6D00']
                    });
                    
                    // Second burst for emphasis
                    setTimeout(() => {
                      confetti({
                        particleCount: 100,
                        spread: 100,
                        origin: { y: 0.6 },
                        colors: ['#2667FF', '#00C853', '#FFD600', '#FF6D00']
                      });
                    }, 300);
                    
                    // Generate and download certificate
                    if (result.certHash && result.completionDate) {
                      generateCertificate(result.certHash, result.completionDate);
                    }
                    
                    alert('Congratulations! You have completed all training modules! Your certificate has been downloaded.');
                  }
                  // Refresh training progress
                  const progressRes = await fetch(`/api/training/current-state?user_id=${userId}`);
                  if (progressRes.ok) {
                    const progressData = await progressRes.json() as { progress: any };
                    setTrainingProgress(progressData.progress);
                  }
                }
                
                setShowQuiz(false);
                setActiveModuleId(null);
              }}
              onCancel={() => {
                setShowQuiz(false);
                setActiveModuleId(null);
              }}
            />
          ) : (
            <div className="space-y-4">
              {trainingModules.map((module: any) => {
                const isCompleted = trainingProgress?.current_module_id > module.module_id;
                const isActive = trainingProgress?.current_module_id === module.module_id;
                const isLocked = trainingProgress?.current_module_id < module.module_id;
                const nextUnlockTime = isLocked ? trainingProgress?.next_unlock_at : undefined;
                
                return (
                  <TrainingModuleCard
                    key={module.module_id}
                    moduleId={module.module_id}
                    moduleTitle={module.module_title}
                    estimatedDuration={module.estimated_duration_minutes}
                    status={isCompleted ? 'completed' : isActive ? 'active' : 'locked'}
                    nextUnlockTime={nextUnlockTime}
                    onStart={() => {
                      if (isActive) {
                        setActiveModuleId(module.module_id);
                        setShowQuiz(true);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTile === "geolocation" && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Transparency Sync Node</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white/5 rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div style={{ color: 'var(--text)' }}>Geolocation Sync</div>
                <div style={{ color: 'var(--text)', opacity: 0.6, fontSize: '0.875rem' }}>
                  {geolocationEnabled ? 'Active - Pinging location to backend' : 'Inactive'}
                </div>
              </div>
              <button
                onClick={() => {
                  setGeolocationEnabled(!geolocationEnabled);
                  if (!geolocationEnabled) {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                          setLastLocationPing(new Date());
                        },
                        (error) => {
                          alert('Unable to retrieve location');
                        }
                      );
                    }
                  } else {
                    setCurrentLocation(null);
                    setLastLocationPing(null);
                  }
                }}
                className={`px-4 py-2 rounded-lg transition-all ${geolocationEnabled ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}
              >
                {geolocationEnabled ? 'Disable Sync' : 'Enable Sync'}
              </button>
            </div>
            {currentLocation && (
              <div className="bg-white/5 rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
                <div style={{ color: 'var(--text)', opacity: 0.6 }}>Current Location</div>
                <div className="mt-1 font-mono text-sm" style={{ color: 'var(--text-h)' }}>
                  Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                </div>
                {lastLocationPing && (
                  <div className="mt-1 text-sm" style={{ color: 'var(--text)', opacity: 0.6 }}>
                    Last ping: {lastLocationPing.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div style={{ color: '#3b82f6', fontSize: '1.25rem' }}>📍</div>
                <div>
                  <h4 className="font-semibold" style={{ color: '#1e40af' }}>Privacy Notice</h4>
                  <p className="text-sm" style={{ color: '#1e40af', opacity: 0.8 }}>
                    Your location is only shared when you're on the way to a job. This helps clients track your arrival for better service coordination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
