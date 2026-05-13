import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock the database
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

import { getDb } from '@/lib/db';
import QRCode from 'qrcode';

describe('QR Code API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/promo-codes/[id]/qr-code', () => {
    it('should generate QR code for valid promo code', async () => {
      const mockDb = {
        prepare: jest.fn().mockReturnThis(),
        bind: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          code: 'TEST20',
          description: 'Test promo',
          discount_type: 'percentage',
          discount_value: 20,
        }),
      };
      (getDb as jest.Mock).mockResolvedValue(mockDb);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,testqr');

      const request = new NextRequest('http://localhost:3000/api/promo-codes/1/qr-code');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.qrCode).toBe('data:image/png;base64,testqr');
      expect(data.shareUrl).toContain('TEST20');
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT code')
      );
    });

    it('should return 400 for invalid promo code ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/promo-codes/invalid/qr-code');
      const response = await GET(request, { params: { id: 'invalid' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid promo code ID');
    });

    it('should return 404 for non-existent promo code', async () => {
      const mockDb = {
        prepare: jest.fn().mockReturnThis(),
        bind: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };
      (getDb as jest.Mock).mockResolvedValue(mockDb);

      const request = new NextRequest('http://localhost:3000/api/promo-codes/999/qr-code');
      const response = await GET(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Promo code not found');
    });

    it('should return 500 when database is unavailable', async () => {
      (getDb as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/promo-codes/1/qr-code');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database not available');
    });

    it('should return 500 when QR code generation fails', async () => {
      const mockDb = {
        prepare: jest.fn().mockReturnThis(),
        bind: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          code: 'TEST20',
          description: 'Test promo',
        }),
      };
      (getDb as jest.Mock).mockResolvedValue(mockDb);
      (QRCode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR generation failed'));

      const request = new NextRequest('http://localhost:3000/api/promo-codes/1/qr-code');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate QR code');
    });

    it('should generate correct share URL with NEXT_PUBLIC_BASE_URL', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
      
      const mockDb = {
        prepare: jest.fn().mockReturnThis(),
        bind: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          code: 'SAVE30',
          description: 'Save 30%',
        }),
      };
      (getDb as jest.Mock).mockResolvedValue(mockDb);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,testqr');

      const request = new NextRequest('http://localhost:3000/api/promo-codes/1/qr-code');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(data.shareUrl).toBe('https://example.com/services?promo=SAVE30');
    });

    it('should use default base URL when NEXT_PUBLIC_BASE_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      
      const mockDb = {
        prepare: jest.fn().mockReturnThis(),
        bind: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          code: 'SAVE30',
          description: 'Save 30%',
        }),
      };
      (getDb as jest.Mock).mockResolvedValue(mockDb);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,testqr');

      const request = new NextRequest('http://localhost:3000/api/promo-codes/1/qr-code');
      const response = await GET(request, { params: { id: '1' } });
      const data = await response.json();

      expect(data.shareUrl).toBe('https://scratchsolidsolutions.org/services?promo=SAVE30');
    });
  });
});
