// API Response Types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface Shift {
  id: number;
  start_time: string;
  end_time?: string;
  status: string;
}

export interface Earnings {
  current: number;
  total: number;
}

export interface Rating {
  id: number;
  rating: number;
  date: string;
  comment?: string;
}

export interface ShiftsResponse extends ApiResponse<Shift[]> {}
export interface EarningsResponse extends ApiResponse<Earnings> {}
export interface RatingsResponse extends ApiResponse<Rating[]> {}
