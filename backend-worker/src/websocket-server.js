// WebSocket Server for Cloudflare Workers
// Phase 7: Real-time Architecture (WebSockets vs Supabase)

export class WebSocketServer {
  private clients: Map<string, WebSocket> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private clientRooms: Map<string, Set<string>> = new Map();

  /**
   * Handles new WebSocket connection
   */
  handleConnection(ws: WebSocket, clientId: string): void {
    this.clients.set(clientId, ws);
    console.log(`Client connected: ${clientId}`);

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string);
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    ws.addEventListener('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(clientId);
    });
  }

  /**
   * Handles incoming messages from clients
   */
  private handleMessage(clientId: string, message: any): void {
    switch (message.type) {
      case 'join':
        this.joinRoom(clientId, message.room);
        break;
      case 'leave':
        this.leaveRoom(clientId, message.room);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong' });
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Handles client disconnection
   */
  private handleDisconnection(clientId: string): void {
    this.clients.delete(clientId);
    
    // Remove client from all rooms
    const rooms = this.clientRooms.get(clientId);
    if (rooms) {
      for (const room of rooms) {
        this.leaveRoom(clientId, room);
      }
    }
    
    this.clientRooms.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  }

  /**
   * Joins a room
   */
  joinRoom(clientId: string, room: string): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    
    this.rooms.get(room)!.add(clientId);
    
    if (!this.clientRooms.has(clientId)) {
      this.clientRooms.set(clientId, new Set());
    }
    
    this.clientRooms.get(clientId)!.add(room);
    
    console.log(`Client ${clientId} joined room: ${room}`);
  }

  /**
   * Leaves a room
   */
  leaveRoom(clientId: string, room: string): void {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }
    
    const clientRooms = this.clientRooms.get(clientId);
    if (clientRooms) {
      clientRooms.delete(room);
    }
    
    console.log(`Client ${clientId} left room: ${room}`);
  }

  /**
   * Sends a message to a specific client
   */
  sendToClient(clientId: string, message: any): void {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcasts a message to all clients in a room
   */
  broadcastToRoom(room: string, message: any): void {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      for (const clientId of roomClients) {
        this.sendToClient(clientId, message);
      }
    }
  }

  /**
   * Broadcasts a message to all connected clients
   */
  broadcastToAll(message: any): void {
    for (const clientId of this.clients.keys()) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * Gets connection statistics
   */
  getStats(): { totalClients: number; totalRooms: number; roomDetails: Array<{ room: string; clients: number }> } {
    const roomDetails: Array<{ room: string; clients: number }> = [];
    
    for (const [room, clients] of this.rooms.entries()) {
      roomDetails.push({ room, clients: clients.size });
    }
    
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      roomDetails
    };
  }
}

export class RealTimeEventBus {
  private wsServer: WebSocketServer;

  constructor(wsServer: WebSocketServer) {
    this.wsServer = wsServer;
  }

  /**
   * Publishes an event to a room
   */
  publish(room: string, event: { type: string; data: any }): void {
    this.wsServer.broadcastToRoom(room, event);
  }

  /**
   * Publishes staff location update
   */
  publishStaffLocation(staffId: number, location: { latitude: number; longitude: number }): void {
    this.publish('staff-location', {
      type: 'location-update',
      data: { staffId, location, timestamp: Date.now() }
    });
  }

  /**
   * Publishes booking assignment
   */
  publishBookingAssignment(bookingId: number, staffId: number): void {
    this.publish('booking-assignments', {
      type: 'assignment-created',
      data: { bookingId, staffId, timestamp: Date.now() }
    });
  }

  /**
   * Publishes booking status update
   */
  publishBookingStatus(bookingId: number, status: string): void {
    this.publish('booking-updates', {
      type: 'status-update',
      data: { bookingId, status, timestamp: Date.now() }
    });
  }
}

export class LiveStatusBroadcaster {
  private eventBus: RealTimeEventBus;
  private intervalId: number | null = null;

  constructor(eventBus: RealTimeEventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Starts broadcasting live status
   */
  start(intervalMs: number = 5000): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.broadcastLiveStatus();
    }, intervalMs);
  }

  /**
   * Stops broadcasting live status
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Broadcasts live status to all clients
   */
  private broadcastLiveStatus(): void {
    this.eventBus.publish('live-status', {
      type: 'status-update',
      data: {
        timestamp: Date.now(),
        onlineStaff: 0, // Would be fetched from database
        activeBookings: 0 // Would be fetched from database
      }
    });
  }
}

// Singleton instances
export const wsServer = new WebSocketServer();
export const eventBus = new RealTimeEventBus(wsServer);
export const liveStatusBroadcaster = new LiveStatusBroadcaster(eventBus);
