# WhatsApp Bot and Free Email Notification Integration Plan

## WhatsApp Bot (Free Tier)
- Use Twilio Sandbox for WhatsApp (free for development, limited to approved numbers)
- Alternative: Use callmebot.com for simple WhatsApp notifications (no code, just HTTP requests)
- Integrate as a Python utility in backend

## Free Email Solution
- Use SMTP with Gmail (free, but may require app password)
- Alternative: Use Mailgun free tier (limited emails/month)
- Integrate as a Python utility in backend

## Implementation Steps
1. Add notification utility module to backend:
   - send_whatsapp_message(to, message)
   - send_email(to, subject, message)
2. Add notification hooks to booking creation and status update endpoints
3. Store WhatsApp number and email in user profile
4. Use environment variables for credentials
5. Document setup for local/dev use

## Next Steps
- Scaffold notification utility in backend/notifications.py
- Add example usage in booking endpoints
- Document environment variable requirements
