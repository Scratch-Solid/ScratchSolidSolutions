export interface PaginationParams {
  page?: string;
  limit?: string;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export function parsePaginationParams(params: PaginationParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(params.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '50')));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationResult {
  const total_pages = Math.ceil(total / limit);
  const has_next_page = page < total_pages;
  const has_prev_page = page > 1;
  
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    total,
    total_pages,
    has_next_page,
    has_prev_page
  };
}
