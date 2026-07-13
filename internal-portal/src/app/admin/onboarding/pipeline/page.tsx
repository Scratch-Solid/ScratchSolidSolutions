'use client';

import { useState, useEffect } from 'react';

interface Applicant {
  id: number;
  name: string;
  phone: string;
  email: string;
  department: string;
  onboarding_stage: string;
  created_at: string;
}

const STAGES = [
  { id: 'consent_pending', label: 'Consent Pending', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'consent_approved', label: 'Consent Approved', color: 'bg-[#F0E6D6] border-[#D8CBB5]' },
  { id: 'profile_created', label: 'Profile Created', color: 'bg-purple-100 border-purple-300' },
  { id: 'contract_signed', label: 'Contract Signed', color: 'bg-green-100 border-green-300' },
  { id: 'training_in_progress', label: 'Training In Progress', color: 'bg-orange-100 border-orange-300' },
  { id: 'active', label: 'Active', color: 'bg-emerald-100 border-emerald-300' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-100 border-red-300' },
];

export default function OnboardingPipeline() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedApplicants, setSelectedApplicants] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    try {
      const response = await fetch('/api/admin/onboarding/pipeline');
      const data = await response.json() as { applicants: Applicant[] };
      setApplicants(data.applicants || []);
    } catch (error) {
      console.error('Failed to fetch applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplicants = applicants.filter(applicant => {
    const matchesFilter = filter === 'all' || applicant.onboarding_stage === filter;
    const matchesSearch = applicant.name.toLowerCase().includes(search.toLowerCase()) ||
                         applicant.phone.includes(search) ||
                         applicant.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getApplicantsByStage = (stageId: string) => {
    return filteredApplicants.filter(a => a.onboarding_stage === stageId);
  };

  const getStageStats = () => {
    return STAGES.map(stage => ({
      ...stage,
      count: getApplicantsByStage(stage.id).length
    }));
  };

  const handleBulkApprove = async () => {
    if (selectedApplicants.length === 0) return;
    setBulkActionLoading(true);
    try {
      const response = await fetch('/api/admin/onboarding/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedApplicants }),
      });
      if (response.ok) {
        setSelectedApplicants([]);
        fetchApplicants();
      }
    } catch (error) {
      console.error('Bulk approve failed:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRemind = async () => {
    if (selectedApplicants.length === 0) return;
    setBulkActionLoading(true);
    try {
      const response = await fetch('/api/admin/onboarding/bulk-remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedApplicants, message: 'Please complete your onboarding process.' }),
      });
      if (response.ok) {
        alert('Reminders sent successfully');
      }
    } catch (error) {
      console.error('Bulk remind failed:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedApplicants(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const showApplicantDetails = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setShowDetails(true);
  };

  const handleDragStart = (e: React.DragEvent, applicantId: number) => {
    e.dataTransfer.setData('applicantId', applicantId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const applicantId = parseInt(e.dataTransfer.getData('applicantId'));
    
    try {
      const response = await fetch('/api/admin/onboarding/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: applicantId, newStage: targetStage }),
      });
      if (response.ok) {
        fetchApplicants();
      }
    } catch (error) {
      console.error('Failed to update stage:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-500">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 mb-4">Onboarding Pipeline</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-7 gap-4 mb-6">
          {getStageStats().map(stat => (
            <div key={stat.id} className={`${stat.color} border rounded-lg p-4`}>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-sm text-stone-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Stages</option>
            {STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
        </div>

        {/* Bulk Actions */}
        {selectedApplicants.length > 0 && (
          <div className="flex gap-2 mb-4 p-3 bg-[#F7F2EA] border border-[#E9E0D3] rounded-lg">
            <span className="text-sm text-[#1C130D] self-center">
              {selectedApplicants.length} selected
            </span>
            <button
              onClick={handleBulkApprove}
              disabled={bulkActionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {bulkActionLoading ? 'Processing...' : 'Approve Selected'}
            </button>
            <button
              onClick={handleBulkRemind}
              disabled={bulkActionLoading}
              className="px-4 py-2 bg-[#2E1F16] text-white rounded-lg hover:bg-[#241811] disabled:opacity-50"
            >
              {bulkActionLoading ? 'Sending...' : 'Send Reminders'}
            </button>
            <button
              onClick={() => setSelectedApplicants([])}
              className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div 
            key={stage.id} 
            className={`flex-shrink-0 w-80 ${stage.color} border rounded-lg p-4`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <h3 className="font-semibold mb-3 flex justify-between">
              {stage.label}
              <span className="bg-white px-2 py-1 rounded text-sm">
                {getApplicantsByStage(stage.id).length}
              </span>
            </h3>
            <div className="space-y-2">
              {getApplicantsByStage(stage.id).map(applicant => (
                <div 
                  key={applicant.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, applicant.id)}
                  className={`bg-white p-3 rounded shadow-sm cursor-pointer border-2 ${
                    selectedApplicants.includes(applicant.id) ? 'border-[#B08A5E]' : 'border-transparent'
                  } hover:border-stone-300`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName !== 'INPUT') {
                      showApplicantDetails(applicant);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedApplicants.includes(applicant.id)}
                      onChange={() => toggleSelection(applicant.id)}
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{applicant.name}</div>
                      <div className="text-sm text-stone-500">{applicant.phone}</div>
                      <div className="text-sm text-stone-500">{applicant.email}</div>
                      <div className="text-xs text-stone-400 mt-1">
                        {new Date(applicant.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Applicant Details Modal */}
      {showDetails && selectedApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Applicant Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-stone-500 hover:text-stone-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-stone-600">Name</label>
                <p className="text-stone-900">{selectedApplicant.name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-600">Phone</label>
                <p className="text-stone-900">{selectedApplicant.phone}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-600">Email</label>
                <p className="text-stone-900">{selectedApplicant.email}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-600">Department</label>
                <p className="text-stone-900">{selectedApplicant.department}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-600">Current Stage</label>
                <p className="text-stone-900">{selectedApplicant.onboarding_stage}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-stone-600">Created At</label>
                <p className="text-stone-900">{new Date(selectedApplicant.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
