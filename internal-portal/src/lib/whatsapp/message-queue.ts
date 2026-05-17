// Message Queue for WhatsApp Gateway
// Phase 4: WhatsApp Gateway Architecture & Integration Design

export interface QueuedMessage {
  id: string;
  to: string;
  body: string;
  mediaUrls?: string[];
  priority: 'low' | 'normal' | 'high';
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  createdAt: Date;
}

export class MessageQueue {
  private queue: Map<string, QueuedMessage> = new Map();
  private processing: Set<string> = new Set();
  private rateLimit: number = 1; // messages per second
  private lastSentAt: number = 0;

  /**
   * Enqueues a message for sending
   */
  enqueue(message: Omit<QueuedMessage, 'id' | 'attempts' | 'nextRetryAt' | 'createdAt'>): string {
    const id = crypto.randomUUID();
    const queuedMessage: QueuedMessage = {
      ...message,
      id,
      attempts: 0,
      maxAttempts: message.maxAttempts || 3,
      nextRetryAt: new Date(),
      createdAt: new Date()
    };

    this.queue.set(id, queuedMessage);
    return id;
  }

  /**
   * Processes the message queue
   */
  async processQueue(sendMessage: (to: string, body: string, mediaUrls?: string[]) => Promise<void>): Promise<void> {
    const now = Date.now();
    const messagesToSend: QueuedMessage[] = [];

    // Get messages that are ready to send
    for (const [id, message] of this.queue.entries()) {
      if (this.processing.has(id)) continue;
      if (message.nextRetryAt.getTime() > now) continue;

      messagesToSend.push(message);
      this.processing.add(id);
    }

    // Sort by priority
    messagesToSend.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Send messages with rate limiting
    for (const message of messagesToSend) {
      try {
        // Rate limiting
        const timeSinceLastSend = now - this.lastSentAt;
        if (timeSinceLastSend < (1000 / this.rateLimit)) {
          await new Promise(resolve => setTimeout(resolve, (1000 / this.rateLimit) - timeSinceLastSend));
        }

        await sendMessage(message.to, message.body, message.mediaUrls);
        this.queue.delete(message.id);
        this.processing.delete(message.id);
        this.lastSentAt = Date.now();
      } catch (error) {
        console.error('Failed to send message:', error);
        message.attempts++;

        if (message.attempts >= message.maxAttempts) {
          this.queue.delete(message.id);
        } else {
          // Exponential backoff
          const retryDelay = Math.pow(2, message.attempts) * 1000;
          message.nextRetryAt = new Date(Date.now() + retryDelay);
        }

        this.processing.delete(message.id);
      }
    }
  }

  /**
   * Gets queue statistics
   */
  getStats(): { total: number; processing: number; byPriority: Record<string, number> } {
    const byPriority: Record<string, number> = { high: 0, normal: 0, low: 0 };

    for (const message of this.queue.values()) {
      byPriority[message.priority]++;
    }

    return {
      total: this.queue.size,
      processing: this.processing.size,
      byPriority
    };
  }

  /**
   * Cleans up old messages
   */
  cleanup(olderThan: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)): void {
    for (const [id, message] of this.queue.entries()) {
      if (message.createdAt < olderThan) {
        this.queue.delete(id);
      }
    }
  }
}

// Singleton instance
export const messageQueue = new MessageQueue();
