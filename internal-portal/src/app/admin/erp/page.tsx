"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Briefcase, ExternalLink, Clock } from "lucide-react";

const ERP_URL = process.env.NEXT_PUBLIC_ERP_URL || "";
const ERP_ENABLED = ERP_URL.length > 0;

export default function ErpConsolePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">ERP Console</h1>
        <p className="text-sm text-stone-500 mt-1">Enterprise resource planning integration.</p>
      </div>

      {ERP_ENABLED ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#2E1F16]" />
              <h2 className="text-lg font-semibold text-stone-900">ERPNext</h2>
            </div>
            <a href={ERP_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open in new tab
              </Button>
            </a>
          </div>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <iframe
              src={ERP_URL}
              title="ERPNext Console"
              className="h-[calc(100vh-14rem)] w-full"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-lg text-center">
            <CardHeader>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
                <Clock className="h-7 w-7 text-stone-400" />
              </div>
              <CardTitle className="text-xl">ERP Console — Coming Soon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-stone-500">
                The ERPNext console is not connected yet. Once ERPNext is onboarded, this
                page will embed the full ERP (payroll, employees, invoicing) directly inside
                the admin dashboard.
              </p>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-left">
                <p className="text-xs font-medium text-stone-700">To enable:</p>
                <p className="mt-1 text-xs text-stone-500">
                  Set <code className="rounded bg-white px-1 py-0.5 font-mono text-stone-700 border border-stone-200">NEXT_PUBLIC_ERP_URL</code>{" "}
                  (e.g. <code className="rounded bg-white px-1 py-0.5 font-mono text-stone-700 border border-stone-200">https://erp.scratchsolidsolutions.org</code>)
                  in the portal environment vars and redeploy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
