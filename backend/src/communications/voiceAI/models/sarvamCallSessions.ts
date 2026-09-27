import { EventEmitter } from 'events';

export interface SarvamCallSession {
  callId: string;
  from?: string;      // Caller phone number
  to?: string;        // Sarvam number
  direction?: string; // 'inbound'
  createdAt: Date;
  answeredAt?: Date;  // When WebSocket connected
  endedAt?: Date;
  durationSec?: number; // Call duration in seconds
  status: 'ringing' | 'answered' | 'ended' | 'missed' | 'failed';
  whatsappTriggered?: boolean;      // Idempotency flag
  whatsappTriggeredAt?: Date;
  metadata?: Record<string, any>;
}

class SarvamCallSessionManager extends EventEmitter {
  private sessions: Map<string, SarvamCallSession> = new Map();

  create(session: SarvamCallSession) {
    this.sessions.set(session.callId, session);
    this.emit('created', session);
    return session;
  }

  get(callId: string) {
    return this.sessions.get(callId);
  }

  update(callId: string, patch: Partial<SarvamCallSession>) {
    const s = this.sessions.get(callId);
    if (!s) return undefined;
    const updated = Object.assign(s, patch);
    this.sessions.set(callId, updated);
    this.emit('updated', updated);
    return updated;
  }

  delete(callId: string) {
    const s = this.sessions.get(callId);
    if (!s) return false;
    this.sessions.delete(callId);
    this.emit('deleted', s);
    return true;
  }

  list() {
    return Array.from(this.sessions.values());
  }
}

export const sarvamCallSessionManager = new SarvamCallSessionManager();

export default sarvamCallSessionManager;