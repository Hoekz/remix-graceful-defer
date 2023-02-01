import type { DeferrableSession } from './Session';

export type PersistenceChangeCallback = (err: Error | null, session: DeferrableSession) => void;
export type Unsubscribe = () => void;

export abstract class SessionPersistence {
  abstract persist(session: DeferrableSession): Promise<boolean>;
  abstract destroy(session: DeferrableSession): Promise<boolean>;
  abstract onChange(session: DeferrableSession, callback: PersistenceChangeCallback): Unsubscribe;
}
