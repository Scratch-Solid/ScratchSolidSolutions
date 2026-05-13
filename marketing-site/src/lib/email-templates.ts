export interface QuoteEmailData {
  refNumber: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  baselinePrice: number;
  discountAmount: number;
  finalPrice: number;
  promoCode?: string;
  validUntil: string;
}

export function generateQuoteConfirmationEmail(data: QuoteEmailData): string {
  const { refNumber, customerName, customerEmail, serviceName, baselinePrice, discountAmount, finalPrice, promoCode, validUntil } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote from Scratch Solid Solutions</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #1e40af;
    }
    .header h1 {
      color: #1e40af;
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 30px 20px;
    }
    .quote-details {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .quote-details h2 {
      color: #1e40af;
      margin-top: 0;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .price-row:last-child {
      border-bottom: none;
    }
    .price-row.total {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      border-top: 2px solid #1e40af;
      padding-top: 15px;
      margin-top: 15px;
    }
    .button {
      display: inline-block;
      background: #1e40af;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      padding: 20px;
      border-top: 1px solid #e2e8f0;
      color: #666;
      font-size: 14px;
    }
    .highlight {
      background: #fef3c7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #f59e0b;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Scratch Solid Solutions</h1>
    <p>Professional Cleaning Services</p>
  </div>

  <div class="content">
    <p>Dear ${customerName},</p>
    
    <p>Thank you for requesting a quote from Scratch Solid Solutions. We're pleased to provide you with the following quote:</p>

    <div class="quote-details">
      <h2>Quote Details</h2>
      <p><strong>Reference Number:</strong> ${refNumber}</p>
      <p><strong>Service:</strong> ${serviceName}</p>
      
      <div class="price-row">
        <span>Base Price</span>
        <span>R${baselinePrice.toFixed(2)}</span>
      </div>
      ${discountAmount > 0 ? `
      <div class="price-row" style="color: #166534;">
        <span>Discount ${promoCode ? `(${promoCode})` : ''}</span>
        <span>- R${discountAmount.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="price-row total">
        <span>Total</span>
        <span>R${finalPrice.toFixed(2)}</span>
      </div>
    </div>

    <div class="highlight">
      <strong>This quote is valid until ${new Date(validUntil).toLocaleDateString()}.</strong>
    </div>

    <p>To accept this quote and proceed with booking, please click the button below:</p>
    
    <a href="https://scratchsolidsolutions.org/services?quote=${refNumber}" class="button">Accept Quote & Book</a>

    <p>If you have any questions or would like to discuss this quote further, please don't hesitate to contact us:</p>
    
    <p>
      <strong>Email:</strong> info@scratchsolidsolutions.org<br>
      <strong>Phone:</strong> +27 69 673 5947<br>
      <strong>WhatsApp:</strong> +27 69 673 5947
    </p>

    <p>We look forward to working with you!</p>

    <p>Best regards,<br>The Scratch Solid Solutions Team</p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Scratch Solid Solutions. All rights reserved.</p>
    <p>This is an automated email. Please do not reply directly to this message.</p>
  </div>
</body>
</html>
  `;
}

export interface PromoCodeEmailData {
  promoCode: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validUntil: string;
  recipientEmail: string;
  shareUrl: string;
}

export function generatePromoCodeEmail(data: PromoCodeEmailData): string {
  const { promoCode, description, discountType, discountValue, validUntil, recipientEmail, shareUrl } = data;

  const discountText = discountType === 'percentage' 
    ? `${discountValue}% off` 
    : `R${discountValue} off`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exclusive Promo Code from Scratch Solid Solutions</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 20px;
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      border-radius: 12px 12px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
    }
    .content {
      padding: 30px 20px;
      background: white;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 12px 12px;
    }
    .promo-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      padding: 30px;
      text-align: center;
      border-radius: 12px;
      margin: 20px 0;
      border: 3px dashed #f59e0b;
    }
    .promo-code {
      font-size: 36px;
      font-weight: bold;
      color: #1e40af;
      letter-spacing: 3px;
      margin: 15px 0;
    }
    .discount {
      font-size: 24px;
      color: #166534;
      font-weight: bold;
    }
    .button {
      display: inline-block;
      background: #1e40af;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 18px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
    .validity {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Special Offer!</h1>
    <p>Exclusive Discount for You</p>
  </div>

  <div class="content">
    <p>We have an exclusive promo code just for you!</p>

    <div class="promo-box">
      <p class="discount">${discountText}</p>
      <p>${description}</p>
      <div class="promo-code">${promoCode}</div>
      <p class="validity">Valid until ${new Date(validUntil).toLocaleDateString()}</p>
    </div>

    <p>Use this code when requesting a quote to receive your discount. Simply enter the code in the promo code field on our quote request form.</p>

    <a href="${shareUrl}" class="button">Get Your Quote Now</a>

    <p>Terms and conditions may apply. This promo code cannot be combined with other offers.</p>

    <p>If you have any questions, feel free to contact us:</p>
    
    <p>
      <strong>Email:</strong> info@scratchsolidsolutions.org<br>
      <strong>Phone:</strong> +27 69 673 5947<br>
      <strong>WhatsApp:</strong> +27 69 673 5947
    </p>

    <p>We look forward to serving you!</p>

    <p>Best regards,<br>The Scratch Solid Solutions Team</p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Scratch Solid Solutions. All rights reserved.</p>
    <p>This is an automated email. Please do not reply directly to this message.</p>
  </div>
</body>
</html>
  `;
}
