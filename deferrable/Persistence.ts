import fs from 'fs';
import path from 'path';
import { type DeferrableSession } from './Session';

type CB = (err: Error | null, session: DeferrableSession) => void;
type Unsubscribe = () => void;

export abstract class SessionPersistance {
  abstract persist(session: DeferrableSession): Promise<boolean>;
  abstract destroy(session: DeferrableSession): Promise<boolean>;
  abstract onChange(session: DeferrableSession, callback: CB): Unsubscribe;
}

export class FileBasedPersistence extends SessionPersistance {
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

  onChange(session: DeferrableSession, callback: CB) {
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
