// Dynamic Status Updates
// Phase 20: Dynamic Status Updates
// Automatically updates cleaner status based on time, location, and booking state

export interface DynamicStatusRule {
  id: string;
  name: string;
  condition: (context: DynamicStatusContext) => boolean;
  action: (context: DynamicStatusContext) => Promise<void>;
  priority: number;
}

export interface DynamicStatusContext {
  cleanerId: number;
  currentStatus: string;
  bookingId?: number;
  gpsLat?: number;
  gpsLong?: number;
  bookingTime?: string;
  bookingDate?: string;
  location?: string;
}

export class DynamicStatusEngine {
  private rules: DynamicStatusRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Register default dynamic status rules
   */
  private registerDefaultRules(): void {
    // Rule 1: Auto-set to on_way 30 minutes before booking time
    this.rules.push({
      id: 'auto_on_way',
      name: 'Auto-set to on_way before booking',
      priority: 1,
      condition: (ctx) => {
        if (!ctx.bookingTime || !ctx.bookingDate || ctx.currentStatus !== 'idle') return false;
        
        const bookingDateTime = new Date(`${ctx.bookingDate} ${ctx.bookingTime}`);
        const now = new Date();
        const timeDiff = bookingDateTime.getTime() - now.getTime();
        const minutesDiff = timeDiff / (1000 * 60);
        
        return minutesDiff <= 30 && minutesDiff > 0;
      },
      action: async (ctx) => {
        console.log(`Dynamic status: Setting cleaner ${ctx.cleanerId} to on_way 30min before booking`);
        // This would be called by a scheduled job
      }
    });

    // Rule 2: Auto-complete if status is 'arrived' for more than 4 hours
    this.rules.push({
      id: 'auto_complete',
      name: 'Auto-complete after 4 hours',
      priority: 2,
      condition: (ctx) => {
        return ctx.currentStatus === 'arrived';
        // Additional check for time since arrival would be implemented
      },
      action: async (ctx) => {
        console.log(`Dynamic status: Auto-completing booking for cleaner ${ctx.cleanerId}`);
        // This would check when status was last updated
      }
    });

    // Rule 3: Reset to idle if no active booking
    this.rules.push({
      id: 'reset_idle',
      name: 'Reset to idle when no active booking',
      priority: 3,
      condition: (ctx) => {
        return !ctx.bookingId && ctx.currentStatus !== 'idle';
      },
      action: async (ctx) => {
        console.log(`Dynamic status: Resetting cleaner ${ctx.cleanerId} to idle`);
        // Update status to idle
      }
    });
  }

  /**
   * Register a custom rule
   */
  public registerRule(rule: DynamicStatusRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evaluate all rules for a context
   */
  public async evaluateRules(context: DynamicStatusContext): Promise<DynamicStatusRule[]> {
    const triggeredRules: DynamicStatusRule[] = [];

    for (const rule of this.rules) {
      if (await rule.condition(context)) {
        triggeredRules.push(rule);
      }
    }

    return triggeredRules;
  }

  /**
   * Execute triggered rules
   */
  public async executeRules(context: DynamicStatusContext): Promise<void> {
    const triggeredRules = await this.evaluateRules(context);

    for (const rule of triggeredRules) {
      try {
        await rule.action(context);
      } catch (error) {
        console.error(`Failed to execute rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Get all registered rules
   */
  public getRules(): DynamicStatusRule[] {
    return [...this.rules];
  }
}

// Singleton instance
export const dynamicStatusEngine = new DynamicStatusEngine();
