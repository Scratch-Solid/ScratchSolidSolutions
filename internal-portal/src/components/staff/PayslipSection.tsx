"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";

interface Payslip {
  id: string | number;
  period: string;
  pay_date: string | null;
  task_count?: number;
  rate_per_task?: number;
  hours_worked?: number;
  hourly_rate?: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  status: string;
}

function generatePayslipPdf(payslip: Payslip, staffName: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(20);
  doc.setTextColor(46, 31, 22);
  doc.setFont("helvetica", "bold");
  doc.text("Scratch Solid Solutions", 105, 25, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Payslip", 105, 34, { align: "center" });

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 42, 190, 42);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Employee: ${staffName}`, 20, 54);
  doc.text(`Period: ${payslip.period}`, 20, 62);
  doc.text(`Pay Date: ${payslip.pay_date || "Current period (in progress)"}`, 20, 70);
  doc.text(`Status: ${payslip.status === "accruing" ? "In progress" : "Final"}`, 20, 78);

  doc.line(20, 86, 190, 86);

  let y = 96;
  doc.setFont("helvetica", "bold");
  doc.text("Earnings", 20, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  if (payslip.task_count !== undefined) {
    doc.text(`Completed tasks: ${payslip.task_count} x R${(payslip.rate_per_task ?? 0).toFixed(2)}`, 20, y);
    doc.text(`R${payslip.gross_pay.toFixed(2)}`, 170, y, { align: "right" });
  } else {
    doc.text(`Hours worked: ${(payslip.hours_worked ?? 0).toFixed(1)} x R${(payslip.hourly_rate ?? 0).toFixed(2)}`, 20, y);
    doc.text(`R${payslip.gross_pay.toFixed(2)}`, 170, y, { align: "right" });
  }
  y += 8;
  doc.text("Deductions", 20, y);
  doc.text(`-R${payslip.deductions.toFixed(2)}`, 170, y, { align: "right" });

  y += 4;
  doc.line(20, y, 190, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Net Pay", 20, y);
  doc.text(`R${payslip.net_pay.toFixed(2)}`, 170, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("This is a system-generated payslip.", 105, 280, { align: "center" });

  doc.save(`payslip-${payslip.period.replace(/\s+/g, "-")}.pdf`);
}

export default function PayslipSection() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
        const res = await fetch("/api/cleaner/payslips", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json() as { data?: Payslip[]; message?: string };
          setPayslips(data.data || []);
          if (data.message) setMessage(data.message);
        }
      } catch {
        // handled by empty state below
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const staffName = typeof window !== "undefined" ? (localStorage.getItem("username") || "Staff Member") : "Staff Member";

  if (loading) {
    return <div className="glass-card p-6 text-center" style={{ color: "var(--text-light)" }}>Loading payslips...</div>;
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-h)" }}>Payslips</h3>
      {payslips.length === 0 ? (
        <div className="text-center py-8" style={{ color: "var(--text-light)" }}>
          {message || "No payslips available yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {payslips.map((payslip) => (
            <div key={payslip.id} className="bg-white/5 rounded-lg p-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold" style={{ color: "var(--text-h)" }}>{payslip.period}</div>
                  <div className="text-sm" style={{ color: "var(--text-light)" }}>
                    {payslip.pay_date || "Current period"} {payslip.status === "accruing" ? "(in progress)" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-lg" style={{ color: "var(--text-h)" }}>R{payslip.net_pay.toFixed(2)}</div>
                    <div className="text-sm" style={{ color: "var(--text-light)" }}>Net Pay</div>
                  </div>
                  <button
                    onClick={() => generatePayslipPdf(payslip, staffName)}
                    className="bg-white/20 hover:bg-white/30 px-3 py-2 text-sm rounded border transition-all"
                    style={{ color: "var(--text)", borderColor: "rgba(12, 37, 74, 0.12)" }}
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
