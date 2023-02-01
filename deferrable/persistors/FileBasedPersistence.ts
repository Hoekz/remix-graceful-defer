import fs from 'fs';
import path from 'path';
import type { PersistenceChangeCallback, SessionPersistence } from '../Persistence';
import type { DeferrableSession } from '../Session';

export class FileBasedPersistence implements SessionPersistence {
  static directory = path.join(process.cwd(), '.sessions');

  async persist(session: DeferrableSession) {
    try {
      await fs.promises.writeFile(path.join(FileBasedPersistence.directory, session.id), '');
      return true;
    } catch {
      return false;
    }
  }

  async destroy(session: DeferrableSession) {
    try {
      await fs.promises.rm(path.join(FileBasedPersistence.directory, session.id));
      return true;
    } catch {
      return false;
    }
  }

  onChange(session: DeferrableSession, callback: PersistenceChangeCallback) {
    const watcher = fs.watch(
      path.join(FileBasedPersistence.directory, session.id),
      { persistent: false },
      (eventType) => {
        if (eventType === 'rename') {
          session.deferrable = true;
          callback(null, session);
          watcher.close();
        }
      },
    );
    
    return () => watcher.close();
  }
}
