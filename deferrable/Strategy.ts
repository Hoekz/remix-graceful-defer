import { PassThrough } from 'stream';
import { type SessionPersistence } from './Persistence';
import { type DeferrableSession } from './Session';

type PipeFunc = (s: PassThrough) => PassThrough;
type ResolveFunc = (s: DeferrableStrategy) => void;

export abstract class DeferrableStrategy extends PassThrough {
  blockable = true;
  released = false;
  blocked = false;

  constructor(
    public session: DeferrableSession,
    public persistor: SessionPersistence,
    public input: PipeFunc,
    public output: ResolveFunc,
  ) {
    super();
    this.blockable = !!this.session.deferrable;
  }

  abstract onReady(): void; // renderToPipeableStream.onShellReady

  abstract onComplete(): void; // renderToPipeableStream.onAllReady

  abstract onError(error: unknown): void; // renderToPipeableStream.onError
}
