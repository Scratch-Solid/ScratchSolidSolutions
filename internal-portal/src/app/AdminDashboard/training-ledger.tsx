import React, { useEffect, useState } from 'react';

interface TrainingProgress {
  user_id: string;
  training_status: 'Trainee' | 'Completed';
  current_module_id: number;
  last_completed_at: string | null;
  next_unlock_at: string | null;
  certificate_url: string | null;
  updated_at: string;
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function TrainingLedger() {
  const [trainingData, setTrainingData] = useState<(TrainingProgress & { staff: StaffMember })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch staff list
      const staffRes = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const staff = await staffRes.json() as StaffMember[];
      
      // Fetch training progress for each staff member
      const trainingPromises = staff.map(async (s) => {
        const progressRes = await fetch(`/api/training/current-state?user_id=${s.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (progressRes.ok) {
          const data = await progressRes.json() as { progress: TrainingProgress };
          return { ...data.progress, staff: s };
        }
        return null;
      });
      
      const results = await Promise.all(trainingPromises);
      const validResults = results.filter((r): r is TrainingProgress & { staff: StaffMember } => r !== null);
      
      setTrainingData(validResults);
    } catch (err) {
      setError('Failed to fetch training data');
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = async (userId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/training/bypass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      
      if (res.ok) {
        alert('Training lock bypassed successfully');
        fetchTrainingData();
      } else {
        alert('Failed to bypass training lock');
      }
    } catch (err) {
      alert('Error bypassing training lock');
    }
  };

  const filteredData = trainingData.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'completed') return item.training_status === 'Completed';
    if (filter === 'in-progress') return item.training_status === 'Trainee';
    return true;
  });

  const completedCount = trainingData.filter(t => t.training_status === 'Completed').length;
  const inProgressCount = trainingData.filter(t => t.training_status === 'Trainee').length;

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/30 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-white/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="responsive-grid grid-cols-3">
        <div className="stats-card">
          <div className="stats-value">{trainingData.length}</div>
          <div className="stats-label">Total Staff</div>
        </div>
        <div className="stats-card">
          <div className="stats-value" style={{ color: 'var(--success)' }}>{completedCount}</div>
          <div className="stats-label">Completed Training</div>
        </div>
        <div className="stats-card">
          <div className="stats-value" style={{ color: 'var(--warning)' }}>{inProgressCount}</div>
          <div className="stats-label">In Progress</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'}`}
            style={{ color: 'var(--text)' }}
          >
            All
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg ${filter === 'completed' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'}`}
            style={{ color: 'var(--text)' }}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg ${filter === 'in-progress' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'}`}
            style={{ color: 'var(--text)' }}
          >
            In Progress
          </button>
        </div>
      </div>

      {/* Training Ledger Table */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Training Progress Ledger</h3>
        
        {filteredData.length === 0 ? (
          <p style={{ color: 'var(--text-light)' }}>No training data found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-3 px-4" style={{ color: 'var(--text-h)' }}>Staff Member</th>
                  <th className="text-left py-3 px-4" style={{ color: 'var(--text-h)' }}>Status</th>
                  <th className="text-left py-3 px-4" style={{ color: 'var(--text-h)' }}>Current Module</th>
                  <th className="text-left py-3 px-4" style={{ color: 'var(--text-h)' }}>Last Completed</th>
                  <th className="text-left py-3 px-4" style={{ color: 'var(--text-h)' }}>Next Unlock</th>
                  <th className="text-left py-3 px-4" style={{ color: 'var(--text-h)' }}>Certificate</th>
                  <th className="text-left py-3 px-4" style={{ color: 'var(--text-h)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-3 px-4" style={{ color: 'var(--text)' }}>
                      <div className="font-medium">{item.staff.first_name} {item.staff.last_name}</div>
                      <div className="text-sm" style={{ color: 'var(--text-light)' }}>{item.staff.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        item.training_status === 'Completed' ? 'badge-success' : 'badge-info'
                      }`}>
                        {item.training_status}
                      </span>
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text)' }}>
                      Day {item.current_module_id} of 5
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text)' }}>
                      {item.last_completed_at ? new Date(item.last_completed_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text)' }}>
                      {item.next_unlock_at ? new Date(item.next_unlock_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text)' }}>
                      {item.certificate_url ? (
                        <span className="text-green-600">✓ Verified</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.training_status === 'Trainee' && item.next_unlock_at && (
                        <button
                          onClick={() => handleBypass(item.user_id)}
                          className="secondary-button text-sm px-3 py-1"
                          title="Bypass time lock"
                        >
                          Bypass Lock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
