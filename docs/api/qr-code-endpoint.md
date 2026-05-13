# QR Code API Endpoint

## Overview

The QR code API endpoint generates QR codes for promo codes that can be scanned by mobile devices to apply discounts.

## Endpoint

```
GET /api/promo-codes/[id]/qr-code
```

## Parameters

### Path Parameters
- `id` (required): The ID of the promo code

## Response

### Success Response (200)
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "shareUrl": "https://scratchsolidsolutions.org/services?promo=CODE20",
  "code": "CODE20",
  "description": "20% off all services"
}
```

### Error Responses

**400 - Invalid promo code ID**
```json
{
  "error": "Invalid promo code ID"
}
```

**404 - Promo code not found**
```json
{
  "error": "Promo code not found"
}
```

**500 - Database not available**
```json
{
  "error": "Database not available"
}
```

**500 - Failed to generate QR code**
```json
{
  "error": "Failed to generate QR code"
}
```

## Usage Example

```javascript
// Fetch QR code for promo code with ID 1
const response = await fetch('/api/promo-codes/1/qr-code');
const data = await response.json();

if (data.success) {
  // Display QR code image
  const img = document.createElement('img');
  img.src = data.qrCode;
  document.body.appendChild(img);
  
  // Or use share URL
  console.log('Share URL:', data.shareUrl);
}
```

## QR Code Specifications

- **Size**: 300x300 pixels
- **Error Correction**: Medium (15% error correction)
- **Margin**: 2 pixels
- **Format**: PNG (base64 encoded data URL)
- **Encoding**: UTF-8

## Share URL Format

The share URL format is:
```
https://scratchsolidsolutions.org/services?promo={CODE}
```

When a user scans the QR code, they will be redirected to the services page with the promo code pre-populated in the quote modal.

## Performance

- Target response time: <200ms
- QR code generation is performed server-side using the `qrcode` library
- Caching can be implemented for frequently accessed promo codes

## Notes

- The endpoint uses the `NEXT_PUBLIC_BASE_URL` environment variable to generate the share URL
- If `NEXT_PUBLIC_BASE_URL` is not set, it defaults to `https://scratchsolidsolutions.org`
- The QR code contains the share URL, not the promo code itself, for better user experience
