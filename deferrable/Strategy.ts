import { PassThrough } from 'stream';
import { type SessionPersistance } from './Persistence';
import { type DeferrableSession } from './Session';

type PipeFunc = (s: PassThrough) => PassThrough;
type ResolveFunc = (s: DeferrableStrategy) => void;

export abstract class DeferrableStrategy extends PassThrough {
  blockable = true;
  released = false;
  blocked = false;

  constructor(
    public session: DeferrableSession,
    public persistor: SessionPersistance,
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

export class BlockUntilComplete extends DeferrableStrategy {
  static prefix = '<!DOCTYPE html><html lang="en">';
  static marker = '<head>';
  private staged = false;
  private watcher?: () => void;

  async onReady() {
    if (this.session.deferrable) {
      this.released = true;
      this.output(this);
      this.input(this);
      return;
    }

    this.blocked = this.session.deferrable === false;

    if (!this.blocked) {
      this.staged = true;
      this.output(this);
      this.write(`${BlockUntilComplete.prefix}${BlockUntilComplete.marker}${this.session.script}`);
      this.blocked = true;

      await this.persistor.persist(this.session);
      this.watcher = this.persistor.onChange(this.session, () => this.unblock());
    }
  }

  onComplete() {
    if (this.released) return;
    this.unblock();
  }

  private unblock() {
    this.blocked = false;
    this.released = true;
    this.output(this);
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
    if (this.staged) {
      this.staged = false;
      const str: string = chunk.toString();
      const stripPrefix = str.indexOf(BlockUntilComplete.marker) + BlockUntilComplete.marker.length;
      return super._write(str.substring(stripPrefix), encoding, callback);
    }

    if (this.released) {
      return super._write(chunk, encoding, callback);
    }
  }

  onError() {
    this.watcher?.();
    this.persistor.destroy(this.session);
  }
}

export class ReplacePlaceholders extends DeferrableStrategy {
  private watcher?: () => void;

  onReady() {
    // TODO: start streaming immediately, writing is intercepted if unknown/not deferrable state
  }

  onComplete() {
    // TODO: hydration is fully ready, complete substitution and release
  }

  replace(chunk: string, template: string) {
    // TODO: returns chunk with template instead of placeholder
  }

  onError() {
    this.watcher?.();
    this.persistor.destroy(this.session);
  }
}

export class HidePlaceholders extends ReplacePlaceholders {
  replace(chunk: string, template: string) {
    // TODO: returns chunk with style tag that hides placeholder and template
  }
}
