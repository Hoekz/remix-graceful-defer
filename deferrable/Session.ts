import type { SessionManager } from './Manager';
import type { PersistenceChangeCallback, SessionPersistence } from './Persistence';

export class DeferrableSession {
  constructor(
    public id: string,
    public deferrable: boolean | undefined,
    public manager: SessionManager,
    public persistor: SessionPersistence,
  ) {}

  get script() {
    if (this.deferrable !== undefined) return '';
    return this.manager.script(this);
  }

  persist() { return this.persistor.persist(this); }
  destroy() { return this.persistor.destroy(this); }
  onChange(callback: PersistenceChangeCallback) { return this.persistor.onChange(this, callback); }
}
