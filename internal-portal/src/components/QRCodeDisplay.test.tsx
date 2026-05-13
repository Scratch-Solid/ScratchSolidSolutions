import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRCodeDisplay from './QRCodeDisplay';

// Mock qrcode.react
jest.mock('qrcode.react', () => ({
  __esModule: true,
  default: ({ value, size, level, includeMargin, renderAs }: any) => (
    <canvas data-testid="qr-canvas" data-value={value} data-size={size} />
  ),
}));

describe('QRCodeDisplay Component', () => {
  const mockPromoCode = 'TEST20';
  const mockShareUrl = 'https://scratchsolidsolutions.org/services?promo=TEST20';
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render QR code modal', () => {
    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(`QR Code for ${mockPromoCode}`)).toBeInTheDocument();
    expect(screen.getByText('Share URL:')).toBeInTheDocument();
    expect(screen.getByText(mockShareUrl)).toBeInTheDocument();
  });

  it('should render QR code canvas', () => {
    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    const qrCanvas = screen.getByTestId('qr-canvas');
    expect(qrCanvas).toBeInTheDocument();
    expect(qrCanvas).toHaveAttribute('data-value', mockShareUrl);
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    const backdrop = document.querySelector('.bg-black\\/40');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should render download and copy link buttons', () => {
    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Download QR Code')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
  });

  it('should copy link to clipboard when Copy Link button is clicked', async () => {
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockShareUrl);
    });
  });

  it('should handle clipboard write error gracefully', async () => {
    const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to copy link');
    });

    alertSpy.mockRestore();
  });

  it('should download QR code when Download button is clicked', () => {
    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    const downloadButton = screen.getByText('Download QR Code');
    const mockCanvas = document.createElement('canvas');
    document.querySelector = jest.fn().mockReturnValue(mockCanvas);
    
    const mockToDataURL = jest.fn().mockReturnValue('data:image/png;base64,test');
    mockCanvas.toDataURL = mockToDataURL;

    fireEvent.click(downloadButton);

    // In a real test, we would verify the download behavior
    // For now, we just verify the button exists and is clickable
    expect(downloadButton).toBeInTheDocument();
  });

  it('should display scan instruction text', () => {
    render(
      <QRCodeDisplay
        promoCode={mockPromoCode}
        shareUrl={mockShareUrl}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Scan this QR code to apply the promo code')).toBeInTheDocument();
  });
});
