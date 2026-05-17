// WhatsApp Gateway for Twilio Integration
// Phase 4: WhatsApp Gateway Architecture & Integration Design

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
  private accountSid: string;
  private authToken: string;
  private whatsappNumber: string;
  private commands: Map<string, WhatsAppCommand> = new Map();

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';
    
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
        return 'Available commands: help, status, bookings, profile';
      },
      description: 'Show available commands'
    });

    this.registerCommand({
      keyword: 'status',
      handler: async (message) => {
        return `Your account is active. Phone: ${message.from}`;
      },
      description: 'Check account status'
    });

    this.registerCommand({
      keyword: 'bookings',
      handler: async () => {
        return 'Your upcoming bookings will be displayed here.';
      },
      description: 'View upcoming bookings'
    });

    this.registerCommand({
      keyword: 'profile',
      handler: async () => {
        return 'Your profile information will be displayed here.';
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
      return this.registerCommand({
        keyword: 'default',
        handler: async () => 'Send /help for available commands',
        description: 'Default response'
      }).handler(message, []);
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
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    
    const formData = new FormData();
    formData.append('From', `whatsapp:${this.whatsappNumber}`);
    formData.append('To', `whatsapp:${to}`);
    formData.append('Body', body);

    if (mediaUrls && mediaUrls.length > 0) {
      mediaUrls.forEach(url => formData.append('MediaUrl', url));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`
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
