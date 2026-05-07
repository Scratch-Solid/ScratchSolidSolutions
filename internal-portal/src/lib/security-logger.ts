import { logSecurityEvent } from './middleware';

export function logAuthFailure(reason: string, details: Record<string, any> = {}) {
  logSecurityEvent('AUTH_FAILURE', { reason, ...details });
}

export function logCSRFFailure(ip: string, details: Record<string, any> = {}) {
  logSecurityEvent('CSRF_FAILURE', { ip, ...details });
}

export function logRateLimitExceeded(ip: string, endpoint: string) {
  logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip, endpoint });
}

export function logUnauthorizedAccess(ip: string, endpoint: string, reason: string) {
  logSecurityEvent('UNAUTHORIZED_ACCESS', { ip, endpoint, reason });
}

export function logInvalidToken(token: string, ip: string) {
  logSecurityEvent('INVALID_TOKEN', { 
    token: token.substring(0, 8) + '...', 
    ip 
  });
}
