import { NextResponse } from 'next/server';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    suggestion?: string;
  };
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    offset: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
}

// Error code registry
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_LENGTH = 'INVALID_FIELD_LENGTH',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  
  // Resource Not Found
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Configuration
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  
  // External API
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Internal Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Error message templates
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: 'Authentication required',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action',
  [ErrorCode.INVALID_TOKEN]: 'Invalid authentication token',
  [ErrorCode.TOKEN_EXPIRED]: 'Authentication token has expired',
  
  [ErrorCode.VALIDATION_ERROR]: 'Invalid input data',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_FIELD_LENGTH]: 'Field length exceeds allowed limit',
  [ErrorCode.INVALID_EMAIL]: 'Invalid email address',
  [ErrorCode.INVALID_PHONE]: 'Invalid phone number',
  [ErrorCode.INVALID_PASSWORD]: 'Password does not meet requirements',
  
  [ErrorCode.NOT_FOUND]: 'Resource not found',
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Requested resource not found',
  
  [ErrorCode.CONFIGURATION_ERROR]: 'Service configuration error',
  [ErrorCode.MISSING_CREDENTIALS]: 'Required credentials are not configured',
  
  [ErrorCode.EXTERNAL_API_ERROR]: 'External service error',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  
  [ErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ErrorCode.DUPLICATE_ENTRY]: 'Duplicate entry detected',
  [ErrorCode.CONSTRAINT_VIOLATION]: 'Database constraint violation',
  
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  
  [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred',
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
};

// HTTP status code mapping
const HTTP_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FIELD_LENGTH]: 400,
  [ErrorCode.INVALID_EMAIL]: 400,
  [ErrorCode.INVALID_PHONE]: 400,
  [ErrorCode.INVALID_PASSWORD]: 400,
  
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  
  [ErrorCode.CONFIGURATION_ERROR]: 503,
  [ErrorCode.MISSING_CREDENTIALS]: 503,
  
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.DUPLICATE_ENTRY]: 409,
  [ErrorCode.CONSTRAINT_VIOLATION]: 400,
  
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500,
};

export function createErrorResponse(
  code: ErrorCode,
  customMessage?: string,
  details?: Record<string, any>,
  customSuggestion?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message: customMessage || ERROR_MESSAGES[code],
      details,
      suggestion: customSuggestion || getDefaultSuggestion(code),
    },
  };
}

export function errorResponse(
  code: ErrorCode,
  customMessage?: string,
  details?: Record<string, any>,
  customSuggestion?: string,
  customStatus?: number
): NextResponse<ErrorResponse> {
  const status = customStatus || HTTP_STATUS_CODES[code];
  const errorData = createErrorResponse(code, customMessage, details, customSuggestion);
  return NextResponse.json(errorData, { status });
}

export function successResponse<T>(
  data: T,
  pagination?: {
    page: number;
    limit: number;
    offset: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  }
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(pagination && { pagination }),
  });
}

function getDefaultSuggestion(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.INVALID_TOKEN:
    case ErrorCode.TOKEN_EXPIRED:
      return 'Please log in again';
    case ErrorCode.FORBIDDEN:
      return 'Contact an administrator if you believe you should have access';
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_INPUT:
    case ErrorCode.MISSING_REQUIRED_FIELD:
    case ErrorCode.INVALID_FIELD_LENGTH:
    case ErrorCode.INVALID_EMAIL:
    case ErrorCode.INVALID_PHONE:
    case ErrorCode.INVALID_PASSWORD:
      return 'Please check your input and try again';
    case ErrorCode.NOT_FOUND:
    case ErrorCode.USER_NOT_FOUND:
    case ErrorCode.RESOURCE_NOT_FOUND:
      return 'Please verify the resource exists and try again';
    case ErrorCode.CONFIGURATION_ERROR:
    case ErrorCode.MISSING_CREDENTIALS:
      return 'Contact support to resolve this configuration issue';
    case ErrorCode.EXTERNAL_API_ERROR:
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 'Please try again later or contact support if the issue persists';
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.DUPLICATE_ENTRY:
    case ErrorCode.CONSTRAINT_VIOLATION:
      return 'Please try again or contact support if the issue persists';
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 'Please wait a moment and try again';
    case ErrorCode.INTERNAL_ERROR:
    case ErrorCode.UNKNOWN_ERROR:
      return 'Please try again later or contact support if the issue persists';
    default:
      return 'Please try again or contact support if the issue persists';
  }
}

// Helper for validation errors
export function validationErrorResponse(
  errors: string[],
  details?: Record<string, any>
): NextResponse<ErrorResponse> {
  return errorResponse(
    ErrorCode.VALIDATION_ERROR,
    'Invalid input data',
    { errors, ...details }
  );
}

// Helper for not found errors
export function notFoundErrorResponse(
  resource: string,
  identifier?: string
): NextResponse<ErrorResponse> {
  const message = identifier
    ? `${resource} with identifier "${identifier}" not found`
    : `${resource} not found`;
  return errorResponse(ErrorCode.NOT_FOUND, message, { resource, identifier });
}

// Helper for unauthorized errors
export function unauthorizedErrorResponse(
  customMessage?: string
): NextResponse<ErrorResponse> {
  return errorResponse(ErrorCode.UNAUTHORIZED, customMessage);
}

// Helper for forbidden errors
export function forbiddenErrorResponse(
  action?: string
): NextResponse<ErrorResponse> {
  const message = action
    ? `You do not have permission to ${action}`
    : undefined;
  return errorResponse(ErrorCode.FORBIDDEN, message);
}
