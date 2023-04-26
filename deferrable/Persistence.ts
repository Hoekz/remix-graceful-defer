import type { DeferrableSession } from './Session';

export type PersistenceChangeCallback = (err: Error | null, session: DeferrableSession) => void;
export type Unsubscribe = () => void;

export interface SessionPersistence {
  persist(session: DeferrableSession): Promise<boolean>;
  destroy(session: DeferrableSession): Promise<boolean>;
  onChange(session: DeferrableSession, callback: PersistenceChangeCallback): Unsubscribe;
}
