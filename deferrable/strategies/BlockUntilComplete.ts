import { DeferrableStrategy } from '../Strategy';

export class BlockUntilComplete extends DeferrableStrategy {
  static prefix = '<!DOCTYPE html><html lang="en">';
  static marker = '<head>';
  private staged = false;
  private watcher?: () => void;

  async onReady() {
    if (this.session.deferrable) {
      return this.unblock();
    }

    this.blocked = this.session.deferrable === false;

    if (!this.blocked) {
      this.output(this);
      this.write(`${BlockUntilComplete.prefix}${BlockUntilComplete.marker}${this.session.script}`);
      this.staged = true;
      this.blocked = true;

      await this.persistor.persist(this.session);
      this.watcher = this.persistor.onChange(this.session, () => this.unblock());
    }
  }

  onComplete() {
    if (this.released) return;
    this.unblock();
    this.persistor.destroy(this.session);
  }

  private unblock() {
    this.blocked = false;
    if (!this.released) {
      this.input(this);
    }
    this.released = true;
    if (!this.staged) {
      this.output(this);
    }
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
    if (this.staged) {
      this.staged = false;
      const str: string = chunk.toString();
      const stripPrefix = str.indexOf(BlockUntilComplete.marker) + BlockUntilComplete.marker.length;
      return super._write(str.substring(stripPrefix), encoding, callback);
    }

    return super._write(chunk, encoding, callback);
  }

  onError(error: unknown) {
    this.watcher?.();
    this.persistor.destroy(this.session);
  }
}
