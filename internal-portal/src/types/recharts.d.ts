declare module 'recharts' {
  import * as React from 'react';

  export interface ResponsiveContainerProps {
    width?: string | number;
    height?: string | number;
    children?: React.ReactNode;
  }
  export const ResponsiveContainer: React.FC<ResponsiveContainerProps>;

  export interface BarChartProps {
    data?: any[];
    children?: React.ReactNode;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
  }
  export const BarChart: React.FC<BarChartProps>;

  export interface LineChartProps {
    data?: any[];
    children?: React.ReactNode;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
  }
  export const LineChart: React.FC<LineChartProps>;

  export interface PieChartProps {
    children?: React.ReactNode;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
  }
  export const PieChart: React.FC<PieChartProps>;

  export interface BarProps {
    dataKey?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }
  export const Bar: React.FC<BarProps>;

  export interface LineProps {
    type?: string;
    dataKey?: string;
    stroke?: string;
    strokeWidth?: number;
    dot?: any;
  }
  export const Line: React.FC<LineProps>;

  export interface PieProps {
    data?: any[];
    cx?: string | number;
    cy?: string | number;
    innerRadius?: number;
    outerRadius?: number;
    fill?: string;
    dataKey?: string;
    nameKey?: string;
    label?: any;
    labelLine?: boolean;
    children?: React.ReactNode;
  }
  export const Pie: React.FC<PieProps>;

  export interface CellProps {
    fill?: string;
    stroke?: string;
  }
  export const Cell: React.FC<CellProps>;

  export interface XAxisProps {
    dataKey?: string;
    stroke?: string;
    tick?: any;
    type?: string;
  }
  export const XAxis: React.FC<XAxisProps>;

  export interface YAxisProps {
    stroke?: string;
    tick?: any;
    type?: string;
    dataKey?: string;
  }
  export const YAxis: React.FC<YAxisProps>;

  export interface CartesianGridProps {
    strokeDasharray?: string;
    stroke?: string;
  }
  export const CartesianGrid: React.FC<CartesianGridProps>;

  export interface TooltipProps {
    contentStyle?: any;
    itemStyle?: any;
    labelStyle?: any;
  }
  export const Tooltip: React.FC<TooltipProps>;

  export interface LegendProps {
    verticalAlign?: string;
    align?: string;
    wrapperStyle?: any;
  }
  export const Legend: React.FC<LegendProps>;
}
