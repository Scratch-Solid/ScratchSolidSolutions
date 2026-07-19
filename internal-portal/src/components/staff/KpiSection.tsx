"use client";

import { useEffect, useState } from "react";

interface KpiBreakdown {
  client: number;
  system: number;
  admin: number;
}

interface KpiBonus {
  kpi5pt: number;
  bonusPercentage: number;
  estimatedBonusAmount: number | null;
  annualSummary: { year: number; kpi5pt: number; bonusPercentage: number } | null;
}

export default function KpiSection() {
  const [kpiScore, setKpiScore] = useState(0);
  const [kpiBreakdown, setKpiBreakdown] = useState<KpiBreakdown | null>(null);
  const [kpiBonus, setKpiBonus] = useState<KpiBonus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const storedUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
        if (!storedUserId) return;
        const res = await fetch(`/api/v2/staff/kpi-score?staffId=${storedUserId}`);
        if (res.ok) {
          const data = await res.json() as any;
          setKpiScore(Math.round((data.averageScore ?? 0) * 10));
          setKpiBreakdown({
            client: Math.round((data.kpi?.clientComponent ?? 0) * 10),
            system: Math.round((data.kpi?.systemComponent ?? 0) * 10),
            admin: Math.round((data.kpi?.adminComponent ?? 0) * 10),
          });
          setKpiBonus({
            kpi5pt: data.kpi?.kpi5pt ?? 0,
            bonusPercentage: data.kpi?.bonusPercentage ?? 0,
            estimatedBonusAmount: data.estimatedBonusAmount ?? null,
            annualSummary: data.annualSummary ?? null,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="glass-card p-6 text-center" style={{ color: "var(--text-light)" }}>Loading KPI data...</div>;
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-h)" }}>KPI Rating</h3>
      <div className="space-y-4">
        <div className="glass-card">
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: "var(--text)" }}>Overall KPI Score</span>
            <span className="text-2xl font-bold" style={{ color: "var(--success)" }}>{kpiScore}/100</span>
          </div>
          <div className="progress-bar mb-3">
            <div className="progress-fill" style={{ width: `${kpiScore}%` }}></div>
          </div>
          {kpiBreakdown && (
            <div className="responsive-grid grid-cols-3 text-xs">
              <div className="text-center">
                <div style={{ color: "var(--text-light)" }}>Client rating (50%)</div>
                <div className="font-semibold" style={{ color: "var(--text-h)" }}>{kpiBreakdown.client}/100</div>
              </div>
              <div className="text-center">
                <div style={{ color: "var(--text-light)" }}>System (25%)</div>
                <div className="font-semibold" style={{ color: "var(--text-h)" }}>{kpiBreakdown.system}/100</div>
              </div>
              <div className="text-center">
                <div style={{ color: "var(--text-light)" }}>Admin review (25%)</div>
                <div className="font-semibold" style={{ color: "var(--text-h)" }}>{kpiBreakdown.admin}/100</div>
              </div>
            </div>
          )}
        </div>

        {kpiBonus && (
          <div className={`glass-card ${kpiBonus.bonusPercentage >= 80 ? "border-green-500/40" : "border-yellow-500/40"}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{kpiBonus.bonusPercentage >= 80 ? "🏆" : "📈"}</span>
              <div>
                <div className="font-semibold" style={{ color: "var(--text-h)" }}>
                  KPI {kpiBonus.kpi5pt.toFixed(1)}/5 — {kpiBonus.bonusPercentage}% bonus &amp; annual increase
                </div>
                <div className="text-sm" style={{ color: "var(--text-light)" }}>
                  {kpiBonus.estimatedBonusAmount !== null
                    ? `Estimated bonus based on your current KPI: R${kpiBonus.estimatedBonusAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} (estimate, not a final figure)`
                    : "Keep your rating up to grow your annual bonus and salary increase."}
                </div>
                {kpiBonus.annualSummary && (
                  <div className="text-xs mt-1" style={{ color: "var(--text-light)", opacity: 0.8 }}>
                    Last finalized: {kpiBonus.annualSummary.year} — KPI {kpiBonus.annualSummary.kpi5pt}/5, {kpiBonus.annualSummary.bonusPercentage}% bonus
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
