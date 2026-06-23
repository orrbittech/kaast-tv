import { io, Socket } from 'socket.io-client';
import { getMediaSocketUrl } from '../api/client';
import type { ControlCommand, MediaSessionState, PairingContext } from '../api/types';

const WS_NAMESPACE = '/media';
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_BACKOFF_MS = 60_000;

type ControlHandler = (command: ControlCommand) => void;
type ConnectionHandler = (connected: boolean) => void;

class MediaSocketClient {
    private socket: Socket | null = null;
    private pairing: PairingContext | null = null;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private reconnectAttempt = 0;
    private controlHandler: ControlHandler | null = null;
    private connectionHandler: ConnectionHandler | null = null;

    onControl(handler: ControlHandler): () => void {
        this.controlHandler = handler;
        return () => {
            if (this.controlHandler === handler) this.controlHandler = null;
        };
    }

    onConnectionChange(handler: ConnectionHandler): () => void {
        this.connectionHandler = handler;
        return () => {
            if (this.connectionHandler === handler) this.connectionHandler = null;
        };
    }

    connect(pairing: PairingContext): void {
        this.pairing = pairing;
        this.disconnectSocketOnly();

        const url = getMediaSocketUrl();
        this.socket = io(`${url}${WS_NAMESPACE}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: MAX_BACKOFF_MS,
        });

        this.socket.on('connect', () => {
            this.reconnectAttempt = 0;
            this.connectionHandler?.(true);
            this.registerDevice();
            this.startHeartbeat();
        });

        this.socket.on('disconnect', () => {
            this.connectionHandler?.(false);
            this.stopHeartbeat();
        });

        this.socket.on('connect_error', () => {
            this.reconnectAttempt += 1;
            this.connectionHandler?.(false);
        });

        this.socket.on('control:command', (payload: ControlCommand) => {
            if (!payload?.deviceId || !this.pairing) return;
            if (payload.deviceId !== this.pairing.deviceId) return;
            this.controlHandler?.(payload);
        });
    }

    disconnect(): void {
        this.stopHeartbeat();
        this.disconnectSocketOnly();
        this.pairing = null;
    }

    private disconnectSocketOnly(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
    }

    private registerDevice(): void {
        if (!this.socket?.connected || !this.pairing) return;
        this.socket.emit('device:register', {
            deviceId: this.pairing.deviceId,
            clerkOrgId: this.pairing.clerkOrgId,
            locationId: this.pairing.locationId,
        });
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (!this.socket?.connected || !this.pairing) return;
            this.socket.emit('device:heartbeat', {
                deviceId: this.pairing.deviceId,
            });
        }, HEARTBEAT_INTERVAL_MS);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    emitSessionState(state: Omit<MediaSessionState, 'deviceId'>): void {
        if (!this.socket?.connected || !this.pairing) return;
        this.socket.emit('session:state', {
            deviceId: this.pairing.deviceId,
            ...state,
        });
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

export const mediaSocket = new MediaSocketClient();
