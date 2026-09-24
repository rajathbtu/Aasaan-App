import { EventEmitter } from 'events';

export interface CallSession {
  callUuid: string;
  from?: string;
  to?: string;
  direction?: string;
  createdAt: Date;
  status: 'ringing' | 'in-progress' | 'ended' | 'failed';
  metadata?: Record<string, any>;
  // runtime properties
  runtime?: any;
}

class CallSessionManager extends EventEmitter {
  private sessions: Map<string, CallSession> = new Map();

  create(session: CallSession) {
    this.sessions.set(session.callUuid, session);
    this.emit('created', session);
    return session;
  }

  get(callUuid: string) {
    return this.sessions.get(callUuid);
  }

  update(callUuid: string, patch: Partial<CallSession>) {
    const s = this.sessions.get(callUuid);
    if (!s) return undefined;
    const updated = Object.assign(s, patch);
    this.sessions.set(callUuid, updated);
    this.emit('updated', updated);
    return updated;
  }

  delete(callUuid: string) {
    const s = this.sessions.get(callUuid);
    if (!s) return false;
    this.sessions.delete(callUuid);
    this.emit('deleted', s);
    return true;
  }

  list() {
    return Array.from(this.sessions.values());
  }
}

export const callSessionManager = new CallSessionManager();

export default callSessionManager;
