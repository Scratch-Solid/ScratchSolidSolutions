# Admin Dashboard QR Code Feature

## Overview

The admin dashboard now includes QR code generation and display functionality for promo codes. This allows administrators to create scannable QR codes that customers can use to apply promo codes.

## Features

### 1. QR Code Generation

Each promo code in the admin dashboard now has a "QR Code" button that generates a scannable QR code.

### 2. QR Code Display Modal

When clicking the "QR Code" button, a modal appears showing:
- The QR code image (300x300 pixels)
- The share URL that the QR code encodes
- Download button to save the QR code as PNG
- Copy link button to copy the share URL to clipboard

### 3. Share URL Format

QR codes encode a shareable URL in the format:
```
https://scratchsolidsolutions.org/services?promo={CODE}
```

When scanned, this redirects users to the services page with the promo code pre-populated.

## Usage

### Generating a QR Code

1. Navigate to the Admin Dashboard
2. Go to "Services Management"
3. Click on the "Promos" tab
4. Find the desired promo code in the list
5. Click the "QR Code" button
6. The QR code modal will appear

### Downloading a QR Code

1. Generate the QR code as described above
2. Click the "Download QR Code" button in the modal
3. The QR code will be saved as `promo-{CODE}.png`

### Copying the Share Link

1. Generate the QR code as described above
2. Click the "Copy Link" button in the modal
3. The share URL will be copied to your clipboard
4. You can share this link directly (without the QR code)

## Component Details

### QRCodeDisplay Component

Located at: `internal-portal/src/components/QRCodeDisplay.tsx`

**Props:**
- `promoCode` (string): The promo code text
- `shareUrl` (string): The URL encoded in the QR code
- `onClose` (function): Callback when modal is closed

**Features:**
- Renders QR code using qrcode.react library
- Download functionality (converts canvas to PNG)
- Copy to clipboard functionality
- Responsive modal with backdrop
- Loading state handling
- Error state handling

## Integration with Services Management

The QR code feature is integrated into the existing services management page at:
`internal-portal/src/app/AdminDashboard/services-management.tsx`

**State Management:**
- `showQRModal`: Controls modal visibility
- `selectedPromoCode`: Stores the currently selected promo code

**Event Handlers:**
- `handleShowQRCode(promo)`: Opens the QR modal for a specific promo
- `handleCloseQRModal()`: Closes the QR modal

## Technical Details

### QR Code Library

- **Library**: qrcode.react v4.1.0
- **Render Mode**: Canvas
- **Error Correction**: Medium (15%)
- **Size**: 200px (displayed), 300px (downloaded)

### Styling

- Modal uses backdrop blur for modern appearance
- Responsive design for mobile and desktop
- Consistent with existing admin dashboard styling
- Blue accent color for QR code button

### Browser Compatibility

- Modern browsers with Canvas API support
- Clipboard API for copy functionality
- Fallback alert if clipboard fails

## Future Enhancements

Potential future improvements:
- QR code customization (colors, logos)
- Bulk QR code generation
- QR code usage analytics
- QR code expiration tracking
- Email QR codes directly to customers
- Print-ready QR code sheets
