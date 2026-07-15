"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Star, TrendingUp, Info } from "lucide-react";

export default function StaffReviews() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ attendance_score: 5, company_values_score: 5, quality_score: 7, communication_score: 7, notes: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) return;
    fetch('/api/admin/cleaners', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then((data: any) => setCleaners(Array.isArray(data) ? data : []))
      .catch(() => setMessage('Failed to load staff'));
  }, []);

  const submitReview = async () => {
    if (!selected) return;
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    try {
      const res = await fetch('/api/admin/staff-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staff_id: selected.id, ...form }),
      });
      if (res.ok) {
        setMessage(`Review submitted for ${selected.first_name}. KPI will be recalculated.`);
        await fetch(`/api/v2/staff/${selected.id}/sync-kpi`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        setForm({ attendance_score: 5, company_values_score: 5, quality_score: 7, communication_score: 7, notes: '' });
        setSelected(null);
        setTimeout(() => setMessage(''), 4000);
      } else {
        setMessage('Failed to submit review');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  };

  const ScoreInput = ({ label, field, min = 0, max = 10 }: { label: string; field: keyof typeof form; min?: number; max?: number }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-stone-700">{label} ({min}–{max})</label>
      <Input
        type="number" min={min} max={max} step="0.5"
        value={form[field] as number}
        onChange={e => setForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) }))}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Monthly Staff Reviews</h2>
          <p className="text-stone-500 text-sm mt-1">Enter monthly scores for attendance, company values, and quality</p>
        </div>
        {message && (
          <Badge variant={message.includes('submitted') ? 'default' : 'destructive'}>
            {message}
          </Badge>
        )}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>25% of this cleaner's KPI</AlertTitle>
        <AlertDescription>
          These four scores make up the admin-review quarter of the KPI formula. The other three
          quarters are automatic: 50% comes from the client's actual rating of the job, and 25%
          from the system (real GPS-based punctuality). Submitting a review automatically triggers
          KPI recalculation.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Staff Review Form
          </CardTitle>
          <CardDescription>Select a staff member and enter their monthly performance scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Select Staff Member</label>
              <Select
                value={selected?.id?.toString() || ''}
                onValueChange={(v) => setSelected(cleaners.find(c => c.id === parseInt(v)) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {cleaners.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected && (
              <div className="space-y-6 p-6 border border-stone-200 rounded-lg bg-stone-50">
                <h3 className="text-lg font-semibold text-stone-900">Review for {selected.first_name} {selected.last_name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ScoreInput label="Attendance Score (0–10)" field="attendance_score" />
                  <ScoreInput label="Company Values Score (0–10)" field="company_values_score" />
                  <ScoreInput label="Quality Score (0–10)" field="quality_score" />
                  <ScoreInput label="Communication Score (0–10)" field="communication_score" />
                </div>
                <p className="text-xs text-stone-500">
                  Client rating and punctuality aren't entered here anymore — client rating comes
                  from the customer's own rating of the job, and punctuality from real GPS
                  check-in data, so re-typing a guess for either would just double-count them.
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">Notes</label>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional review notes…"
                  />
                </div>

                <Button
                  onClick={submitReview}
                  disabled={loading}
                  className="w-full gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  {loading ? 'Submitting…' : 'Submit Review & Sync KPI'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
