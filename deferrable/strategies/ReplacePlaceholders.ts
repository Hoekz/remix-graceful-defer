import { matchPlaceholder, matchTemplate, type Placeholder, type Template } from '../utils/matchers';
import { DeferrableStrategy } from '../Strategy';

interface Chunk {
  chunk: any;
  encoding: BufferEncoding;
  template?: string;
  callback: (error?: Error | null | undefined) => void;
}

const noop = () => {};

export class ReplacePlaceholders extends DeferrableStrategy {
  private watcher?: () => void;
  buffer: Chunk[] = [];

  async onReady() {
    this.blockable = !this.session.deferrable;

    if (this.session.deferrable === undefined) {
      await this.persistor.persist(this.session);
      this.persistor.onChange(this.session, () => {
        this.blockable = false;

        if (this.blocked) {
          this.flushBuffer();
        }
      });
    }

    this.input(this);
    this.output(this);
  }

  onComplete() {
    this.watcher?.();
    this.persistor.destroy(this.session);
    this.flushBuffer();
  }

  private flushBuffer() {
    if (!this.blocked) return;
    this.blocked = false;

    for (const chunk of this.buffer) {
      if (this.blockable && chunk.template) {
        this.blocked = true;
        this.buffer = this.buffer.slice(this.buffer.indexOf(chunk));
        return;
      }
      super._write(chunk.chunk, chunk.encoding, chunk.callback);
    }

    this.buffer = [];
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
    if (!this.blockable) {
      return super._write(chunk, encoding, callback);
    }

    if (this.blocked) {
      const str: string = chunk.toString();
      const template = matchTemplate(str);

      if (template) {
        this.substituteTemplate(template);
      }

      callback();
      this.buffer.push({ chunk, encoding, callback: noop });
      return;
    }

    if (this.blockable) {
      const str: string = chunk.toString();
      const placeholder = matchPlaceholder(str);

      if (!placeholder) {
        return super._write(chunk, encoding, callback);
      }

      super._write(str.substring(0, placeholder.start), encoding, noop);
      
      this.handlePlaceholder(str, encoding, placeholder);
      
      let remainder = str.substring(placeholder.end);
      
      while (remainder.length) {
        const placeholder = matchPlaceholder(remainder);
        
        if (!placeholder) {
          this.buffer.push({ chunk: remainder, encoding, callback: noop });
          break;
        }
        
        if (placeholder.start > 0) {
          this.buffer.push({ chunk: remainder.substring(0, placeholder.start), encoding, callback: noop });
        }
        
        this.handlePlaceholder(remainder, encoding, placeholder);
        remainder = remainder.substring(placeholder.end);
      }
      
      this.blocked = true;
      callback();
      return;
    }

    return super._write(chunk, encoding, callback);
  }

  handlePlaceholder(chunk: string, encoding: BufferEncoding, placeholder: Placeholder) {
    this.buffer.push({
      chunk: chunk.substring(placeholder.start, placeholder.end),
      encoding: encoding,
      template: placeholder.template,
      callback: noop,
    });
  }

  substituteTemplate(template: Template) {
    const placeholder = this.buffer.find(chunk => chunk.template === template.template);

    if (!placeholder) {
      return console.warn(`Unable to find placeholder for template: ${template.template}`);
    }

    placeholder.chunk = template.html;

    if (placeholder === this.buffer[0]) {
      this.releaseUntilNextPlaceholder();
    }
  }

  releaseUntilNextPlaceholder() {
    const releaseUntil = this.buffer.findIndex((chunk, i) => i && chunk.template);
    const release = this.buffer.slice(0, releaseUntil);

    this.buffer = this.buffer.slice(releaseUntil);
    release.forEach(chunk => super._write(chunk.chunk, chunk.encoding, chunk.callback));

    if (!this.buffer.length) {
      this.blocked = false;
    }
  }

  onError(error: unknown) {
    this.watcher?.();
    this.persistor.destroy(this.session);
  }
}
