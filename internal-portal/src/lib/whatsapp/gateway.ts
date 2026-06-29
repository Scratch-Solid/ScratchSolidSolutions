// WhatsApp Gateway for Twilio Integration
// Phase 4: WhatsApp Gateway Architecture & Integration Design

import { getCloudflareContext } from '../runtime-context';

async function getTwilioCreds(): Promise<{ accountSid: string; authToken: string; whatsappNumber: string }> {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
  return {
    accountSid: (env as any)?.TWILIO_ACCOUNT_SID || '',
    authToken: (env as any)?.TWILIO_AUTH_TOKEN || '',
    whatsappNumber: (env as any)?.TWILIO_WHATSAPP_NUMBER || '',
  };
}

export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
  mediaUrls?: string[];
}

export interface WhatsAppCommand {
  keyword: string;
  handler: (message: WhatsAppMessage, params: string[]) => Promise<string>;
  description: string;
}

export class WhatsAppGateway {
  private commands: Map<string, WhatsAppCommand> = new Map();

  constructor() {
    this.registerDefaultCommands();
  }

  /**
   * Registers a new command
   */
  registerCommand(command: WhatsAppCommand): void {
    this.commands.set(command.keyword.toLowerCase(), command);
  }

  /**
   * Registers default commands
   */
  private registerDefaultCommands(): void {
    this.registerCommand({
      keyword: 'help',
      handler: async () => {
        return (
          '📋 *Scratch Solid – Status Commands*\n\n' +
          'Reply with one of these words to update your booking status:\n\n' +
          '▶️  *START* – On my way to the client\n' +
          '📍  *HERE*  – I have arrived at the location\n' +
          '✅  *DONE*  – Job completed\n\n' +
          'Other commands (prefix with /):\n' +
          '/help, /status, /bookings, /profile'
        );
      },
      description: 'Show available commands'
    });

    this.registerCommand({
      keyword: 'status',
      handler: async (message) => {
        return `Your account is active. Registered number: ${message.from}\nReply with START, HERE or DONE to update today's booking status.`;
      },
      description: 'Check account status'
    });

    this.registerCommand({
      keyword: 'bookings',
      handler: async () => {
        return 'View your bookings on the portal: https://portal.scratchsolidsolutions.org\nOr reply START, HERE, or DONE to update today\'s booking.';
      },
      description: 'View upcoming bookings'
    });

    this.registerCommand({
      keyword: 'profile',
      handler: async () => {
        return 'Update your profile on the portal: https://portal.scratchsolidsolutions.org';
      },
      description: 'View profile information'
    });
  }

  /**
   * Processes an incoming WhatsApp message
   */
  async processMessage(message: WhatsAppMessage): Promise<string> {
    const body = message.body.trim();
    
    if (!body.startsWith('/')) {
      return 'Reply with START, HERE, or DONE to update your booking status.\nSend /help for all available commands.';
    }

    const parts = body.substring(1).split(' ');
    const keyword = parts[0].toLowerCase();
    const params = parts.slice(1);

    const command = this.commands.get(keyword);
    
    if (!command) {
      return `Unknown command: ${keyword}. Send /help for available commands`;
    }

    try {
      return await command.handler(message, params);
    } catch (error) {
      console.error('Error processing command:', error);
      return 'Sorry, there was an error processing your command.';
    }
  }

  /**
   * Sends a WhatsApp message
   */
  async sendMessage(to: string, body: string, mediaUrls?: string[]): Promise<void> {
    const { accountSid, authToken, whatsappNumber } = await getTwilioCreds();
    if (!accountSid || !authToken || !whatsappNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new FormData();
    formData.append('From', `whatsapp:${whatsappNumber}`);
    formData.append('To', `whatsapp:${to}`);
    formData.append('Body', body);

    if (mediaUrls && mediaUrls.length > 0) {
      mediaUrls.forEach(url => formData.append('MediaUrl', url));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
      },
      body: formData
    });

    if (!response.ok) {
      const data = await response.json() as { message?: string };
      throw new Error(`Failed to send message: ${data.message || response.statusText}`);
    }
  }

  /**
   * Gets the list of registered commands
   */
  getCommands(): WhatsAppCommand[] {
    return Array.from(this.commands.values());
  }
}

// Singleton instance
export const whatsappGateway = new WhatsAppGateway();
