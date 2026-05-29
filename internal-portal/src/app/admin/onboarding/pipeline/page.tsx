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
  { id: 'consent_approved', label: 'Consent Approved', color: 'bg-blue-100 border-blue-300' },
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

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    try {
      const response = await fetch('/api/admin/onboarding/pipeline');
      const data = await response.json();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Onboarding Pipeline</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-7 gap-4 mb-6">
          {getStageStats().map(stat => (
            <div key={stat.id} className={`${stat.color} border rounded-lg p-4`}>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
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
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div key={stage.id} className={`flex-shrink-0 w-80 ${stage.color} border rounded-lg p-4`}>
            <h3 className="font-semibold mb-3 flex justify-between">
              {stage.label}
              <span className="bg-white px-2 py-1 rounded text-sm">
                {getApplicantsByStage(stage.id).length}
              </span>
            </h3>
            <div className="space-y-2">
              {getApplicantsByStage(stage.id).map(applicant => (
                <div key={applicant.id} className="bg-white p-3 rounded shadow-sm">
                  <div className="font-medium">{applicant.name}</div>
                  <div className="text-sm text-gray-500">{applicant.phone}</div>
                  <div className="text-sm text-gray-500">{applicant.email}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(applicant.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
