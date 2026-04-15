import os
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# WhatsApp via CallMeBot (https://www.callmebot.com/)
CALLMEBOT_API = "https://api.callmebot.com/whatsapp.php"
CALLMEBOT_APIKEY = os.getenv("CALLMEBOT_APIKEY", "demo")  # Replace with your key

# Free email via Gmail SMTP (for dev/testing)
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USER = os.getenv("EMAIL_USER", "your.email@gmail.com")
EMAIL_PASS = os.getenv("EMAIL_PASS", "yourpassword")


def send_whatsapp_message(to_number, message):
    """
    Send WhatsApp message using CallMeBot (free, no code, just HTTP request).
    to_number: in format '+1234567890'
    message: text message
    """
    params = {
        'phone': to_number,
        'text': message,
        'apikey': CALLMEBOT_APIKEY
    }
    try:
        resp = requests.get(CALLMEBOT_API, params=params, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        print(f"WhatsApp send error: {e}")
        return False

def send_email(to_email, subject, message):
    """
    Send email using Gmail SMTP (free for dev/testing).
    """
    msg = MIMEMultipart()
    msg['From'] = EMAIL_USER
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(message, 'plain'))
    try:
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Email send error: {e}")
        return False
