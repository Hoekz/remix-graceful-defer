import type { SessionPersistence } from './Persistence';
import type { DeferrableSession } from './Session';

export interface SessionManager {
  matches(req: Request): boolean;
  getSession(req: Request, persistor: SessionPersistence): DeferrableSession;
  setSession(session: DeferrableSession, res?: Response): Response;
  script(session: DeferrableSession): string;
}
