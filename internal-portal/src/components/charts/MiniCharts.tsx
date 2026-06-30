"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const CHART_VARS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export interface ChartDatum {
  label: string;
  value: number;
}

/** Simple, dependency-free vertical bar chart rendered as SVG. */
export function BarChartCard({
  title,
  data,
  unit = '',
}: {
  title: string;
  data: ChartDatum[];
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / (data.length * 1.5 || 1);
  const gap = barW * 0.5;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <svg viewBox="0 0 100 60" className="h-40 w-full" preserveAspectRatio="none" role="img" aria-label={title}>
            {[0.25, 0.5, 0.75, 1].map((g) => (
              <line key={g} x1="0" x2="100" y1={50 - g * 48} y2={50 - g * 48} stroke="var(--border)" strokeWidth="0.3" />
            ))}
            {data.map((d, i) => {
              const h = (d.value / max) * 48;
              const x = i * (barW + gap) + gap;
              return (
                <rect
                  key={d.label}
                  x={x}
                  y={50 - h}
                  width={barW}
                  height={h}
                  rx="1"
                  fill={CHART_VARS[i % CHART_VARS.length]}
                />
              );
            })}
          </svg>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {data.map((d, i) => (
              <div key={d.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_VARS[i % CHART_VARS.length] }} />
                <span className="font-medium text-foreground">{unit}{d.value}</span>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Simple, dependency-free donut chart rendered as SVG. */
export function DonutChartCard({
  title,
  data,
  centerLabel,
}: {
  title: string;
  data: ChartDatum[];
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--muted)" strokeWidth="10" />
              {total > 0 &&
                data.map((d, i) => {
                  const len = (d.value / total) * circ;
                  const seg = (
                    <circle
                      key={d.label}
                      cx="40"
                      cy="40"
                      r={radius}
                      fill="none"
                      stroke={CHART_VARS[i % CHART_VARS.length]}
                      strokeWidth="10"
                      strokeDasharray={`${len} ${circ - len}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += len;
                  return seg;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{total}</span>
              {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            {data.map((d, i) => (
              <div key={d.label} className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-sm" style={{ background: CHART_VARS[i % CHART_VARS.length] }} />
                <span className="capitalize text-foreground">{d.label}</span>
                <span className="ml-auto font-medium text-muted-foreground">{d.value}</span>
              </div>
            ))}
            {total === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
