import crypto from 'crypto';

export interface DeviceFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding?: string;
  screenResolution?: string;
  colorDepth?: number;
  timezone?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  touchSupport?: boolean;
}

export function generateDeviceFingerprint(fingerprint: DeviceFingerprint): string {
  const data = JSON.stringify(fingerprint);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  device: string;
} {
  const browserRegex = /(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)\/[\d.]+/;
  const osRegex = /(Windows|Mac|Linux|Android|iOS|iPhone|iPad|iPod)/;
  const mobileRegex = /(Mobile|Android|iPhone|iPad|iPod)/;

  const browserMatch = userAgent.match(browserRegex);
  const osMatch = userAgent.match(osRegex);
  const isMobile = userAgent.match(mobileRegex);

  return {
    browser: browserMatch ? browserMatch[0] : 'Unknown',
    os: osMatch ? osMatch[0] : 'Unknown',
    device: isMobile ? 'Mobile' : 'Desktop'
  };
}

export function detectSuspiciousDeviceChange(
  currentFingerprint: string,
  previousFingerprints: string[]
): boolean {
  // If this is the first device, not suspicious
  if (previousFingerprints.length === 0) {
    return false;
  }

  // Check if current fingerprint matches any previous fingerprints
  const isKnownDevice = previousFingerprints.includes(currentFingerprint);

  // If it's a new device and user has multiple previous devices, flag as suspicious
  if (!isKnownDevice && previousFingerprints.length > 0) {
    return true;
  }

  return false;
}
