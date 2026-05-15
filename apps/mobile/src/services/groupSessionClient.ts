import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    if (__DEV__) {
      console.warn('[GroupSession] EXPO_PUBLIC_API_URL not set, using localhost fallback');
      return 'http://localhost:3000';
    }
    throw new Error('EXPO_PUBLIC_API_URL environment variable is required');
  }
  return url;
};

class GroupSessionClient {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(getSocketUrl(), {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[GroupSession] Connected to server');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[GroupSession] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[GroupSession] Connection error:', error.message);
    });

    // Listen to server events
    this.socket.on('memberJoined', (data: any) => this.emit('memberJoined', data));
    this.socket.on('pointUpdated', (data: any) => this.emit('pointUpdated', data));
    this.socket.on('statusUpdated', (data: any) => this.emit('statusUpdated', data));
    this.socket.on('memberLeft', (data: any) => this.emit('memberLeft', data));
    this.socket.on('error', (data: any) => this.emit('error', data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionId = null;
  }

  joinSession(sessionId: string, userId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const timeout = setTimeout(() => reject(new Error('Join session timeout')), 10000);
      this.sessionId = sessionId;

      this.socket.emit('joinSession', { sessionId, userId }, (response: any) => {
        clearTimeout(timeout);
        if (response?.error) {
          this.sessionId = null;
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  updatePoint(pointId: string, isHost: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected || !this.sessionId) {
        reject(new Error('Not in a session'));
        return;
      }

      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      this.socket.emit(
        'updatePoint',
        { sessionId: this.sessionId, pointId, isHost },
        (response: any) => {
          clearTimeout(timeout);
          if (response?.error) reject(new Error(response.error));
          else resolve(response);
        }
      );
    });
  }

  updateStatus(status: string, isHost: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected || !this.sessionId) {
        reject(new Error('Not in a session'));
        return;
      }

      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      this.socket.emit(
        'updateStatus',
        { sessionId: this.sessionId, status, isHost },
        (response: any) => {
          clearTimeout(timeout);
          if (response?.error) reject(new Error(response.error));
          else resolve(response);
        }
      );
    });
  }

  leaveSession(userId: string): Promise<any> {
    return new Promise((resolve) => {
      if (!this.socket?.connected || !this.sessionId) {
        this.sessionId = null;
        resolve({});
        return;
      }

      const timeout = setTimeout(() => {
        this.sessionId = null;
        resolve({});
      }, 5000);

      const sessionId = this.sessionId;
      this.socket.emit('leaveSession', { sessionId, userId }, (response: any) => {
        clearTimeout(timeout);
        this.sessionId = null;
        resolve(response || {});
      });
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  isInSession(): boolean {
    return this.sessionId !== null && this.isConnected();
  }
}

export default new GroupSessionClient();
