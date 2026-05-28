import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface TrainingProgress {
  user_id: number;
  training_status: 'Trainee' | 'Completed';
  current_module_id: number;
  last_completed_at: string | null;
  next_unlock_at: string | null;
  certificate_url: string | null;
  updated_at: string;
}

interface StaffMember {
  id: number;
  user_id?: number;
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      // Fetch staff list
      const staffRes = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const staff = await staffRes.json() as StaffMember[];
      
      // Fetch training progress for each staff member
      const trainingPromises = staff.map(async (s) => {
        const progressRes = await fetch(`/api/training/current-state?user_id=${s.user_id || s.id}`, {
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

  const handleBypass = async (userId: number) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
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
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Clock className="h-6 w-6 animate-spin mr-2" />
        <span>Loading training data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Training Ledger</h2>
        <p className="text-slate-500 text-sm mt-1">Track staff training progress and certifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{trainingData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Completed Training</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{inProgressCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Training Progress Ledger
          </CardTitle>
          <CardDescription>Filter and manage staff training status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredData.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No training data found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Module</TableHead>
                  <TableHead>Last Completed</TableHead>
                  <TableHead>Next Unlock</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.user_id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.staff.first_name} {item.staff.last_name}</div>
                      <div className="text-sm text-slate-500">{item.staff.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.training_status === 'Completed' ? 'default' : 'secondary'}>
                        {item.training_status === 'Completed' ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Trainee
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>Day {item.current_module_id} of 5</TableCell>
                    <TableCell>
                      {item.last_completed_at ? new Date(item.last_completed_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.next_unlock_at ? new Date(item.next_unlock_at).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.certificate_url ? (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.training_status === 'Trainee' && item.next_unlock_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBypass(item.user_id)}
                          title="Bypass time lock"
                        >
                          Bypass Lock
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
