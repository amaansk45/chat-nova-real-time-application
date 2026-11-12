export type WebSocketEventHandler = (data: any) => void;

export class ReconnectingWebSocket {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 2000;
  private maxReconnectInterval: number = 30000;
  private reconnectAttempts: number = 0;
  private isExplicitlyClosed: boolean = false;
  private handlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private pingIntervalId: any = null;

  constructor(path: string, token?: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    if (window.location.port === '3000') {
      host = `${window.location.hostname}:8000`;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    this.url = `${protocol}//${host}${cleanPath}${query}`;
  }

  public connect(): void {
    this.isExplicitlyClosed = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('_open', { connected: true });
        this.startHeartbeat();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'pong') return;

          const eventType = payload.type || payload.action;
          if (eventType) {
            this.emit(eventType, payload);
          }
          this.emit('_all', payload);
        } catch (e) {
          console.error('[WebSocket] Failed to parse message', event.data);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.stopHeartbeat();
        this.emit('_close', event);

        if (!this.isExplicitlyClosed) {
          const timeout = Math.min(
            this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
            this.maxReconnectInterval
          );
          this.reconnectAttempts++;
          setTimeout(() => {
            if (!this.isExplicitlyClosed) {
              this.connect();
            }
          }, timeout);
        }
      };

      this.ws.onerror = (error: Event) => {
        this.emit('_error', error);
      };
    } catch (err) {
      console.error('[WebSocket] Connection failed', err);
    }
  }

  public send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public on(eventType: string, handler: WebSocketEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unbind function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  public off(eventType: string, handler: WebSocketEventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  private emit(eventType: string, data: any): void {
    const listeners = this.handlers.get(eventType);
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[WebSocket] Error in handler for ${eventType}:`, err);
        }
      });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingIntervalId = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  public close(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
