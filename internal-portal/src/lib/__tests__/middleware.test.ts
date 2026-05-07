// Unit tests for middleware functions

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  withApiVersioning,
  withSecurityHeaders,
  withRateLimit,
  getClientIP,
  classifyError,
  handleClassifiedError
} from '../middleware';
import { NextRequest, NextResponse } from 'next/server';

describe('Middleware', () => {
  describe('withApiVersioning', () => {
    it('should allow valid API version', () => {
      const request = new NextRequest('http://localhost/api/v1/test', {
        headers: { 'X-API-Version': 'v1' }
      });
      const result = withApiVersioning(request);
      expect(result).toBeNull();
    });

    it('should reject unsupported API version', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'X-API-Version': 'v2' }
      });
      const result = withApiVersioning(request);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
      });
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new NextRequest('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.1' }
      });
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return unknown if no IP headers present', () => {
      const request = new NextRequest('http://localhost');
      const ip = getClientIP(request);
      expect(ip).toBe('unknown');
    });
  });

  describe('classifyError', () => {
    it('should classify authentication errors', () => {
      const error = new Error('Unauthorized access');
      const classified = classifyError(error);
      expect(classified.category).toBe('AUTHENTICATION');
      expect(classified.statusCode).toBe(401);
    });

    it('should classify validation errors', () => {
      const error = new Error('Invalid input');
      const classified = classifyError(error);
      expect(classified.category).toBe('VALIDATION');
      expect(classified.statusCode).toBe(400);
    });

    it('should classify not found errors', () => {
      const error = new Error('Resource not found');
      const classified = classifyError(error);
      expect(classified.category).toBe('NOT_FOUND');
      expect(classified.statusCode).toBe(404);
    });
  });
});
