// Offline Mode Enhancement
// Phase 19: Offline Mode Enhancement
// Handles data synchronization for offline functionality

interface QueuedOperation {
  id: string;
  type: 'status_update' | 'gps_update' | 'photo_upload';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineSyncManager {
  private queue: QueuedOperation[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueue();
      this.setupOnlineListeners();
      this.checkOnlineStatus();
    }
  }

  /**
   * Check if currently online
   */
  private checkOnlineStatus(): void {
    this.isOnline = navigator.onLine;
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Load queued operations from localStorage
   */
  private loadQueue(): void {
    try {
      const saved = localStorage.getItem('offline_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  /**
   * Save queued operations to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Add operation to queue
   */
  public queueOperation(type: 'status_update' | 'gps_update' | 'photo_upload', data: any): void {
    const operation: QueuedOperation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(operation);
    this.saveQueue();

    // Try to sync immediately if online
    if (this.isOnline && !this.syncInProgress) {
      this.syncQueue();
    }
  }

  /**
   * Sync queued operations
   */
  public async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      for (let i = this.queue.length - 1; i >= 0; i--) {
        const operation = this.queue[i];
        const success = await this.processOperation(operation);

        if (success) {
          this.queue.splice(i, 1);
          this.saveQueue();
        } else {
          operation.retryCount++;
          
          // Remove operations that have failed too many times
          if (operation.retryCount >= 3) {
            console.error(`Operation ${operation.id} failed after 3 retries, removing from queue`);
            this.queue.splice(i, 1);
            this.saveQueue();
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a single queued operation
   */
  private async processOperation(operation: QueuedOperation): Promise<boolean> {
    try {
      switch (operation.type) {
        case 'status_update':
          return await this.syncStatusUpdate(operation.data);
        case 'gps_update':
          return await this.syncGPSUpdate(operation.data);
        case 'photo_upload':
          return await this.syncPhotoUpload(operation.data);
        default:
          console.error(`Unknown operation type: ${operation.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to process operation ${operation.id}:`, error);
      return false;
    }
  }

  /**
   * Sync status update
   */
  private async syncStatusUpdate(data: any): Promise<boolean> {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/cleaner-status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    return response.ok;
  }

  /**
   * Sync GPS update
   */
  private async syncGPSUpdate(data: any): Promise<boolean> {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/cleaner-status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    return response.ok;
  }

  /**
   * Sync photo upload
   */
  private async syncPhotoUpload(data: any): Promise<boolean> {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('booking_id', data.booking_id);
    formData.append('photo', data.photo);
    formData.append('photo_type', data.photo_type);

    const response = await fetch('/api/photos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    return response.ok;
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): { pending: number; isOnline: boolean } {
    return {
      pending: this.queue.length,
      isOnline: this.isOnline
    };
  }

  /**
   * Clear queue
   */
  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager();
