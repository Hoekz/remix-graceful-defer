import { PassThrough } from 'stream';
import { matchPlaceholder, matchTemplate } from './pattern';

interface Chunk {
  chunk: any;
  encoding: BufferEncoding;
  template?: string;
  callback: (error?: Error | null | undefined) => void;
}

export class BlockablePassThrough extends PassThrough {
  private blocking: boolean;
  private blocked: boolean = false;
  private buffer: Chunk[] = [];

  constructor(blocking?: boolean) {
    super();
    this.blocking = blocking ?? false;
  }

  block() {
    this.blocking = true;
  }

  unblock() {
    if (this.blocked) {
      this.flush();
    }

    this.blocking = false;
  }

  private flush() {
    for (const chunk of this.buffer) {
      super._write(chunk.chunk, chunk.encoding, chunk.callback);
    }
    this.buffer = [];
    this.blocked = false;
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
    let chunkRef = { chunk, encoding, callback };

    if (this.blocked) {
      const str = chunkRef.chunk = chunk.toString();
      const template = matchTemplate(str);

      if (template) {
        const placeholder = this.buffer.find(chunk => chunk.template === template.template);

        if (placeholder) {
          placeholder.chunk = template.html;

          if (placeholder === this.buffer[0]) {
            const releaseUntil = this.buffer.findIndex((chunk, i) => i && chunk.template);
            const release = this.buffer.slice(0, releaseUntil);
            this.buffer = this.buffer.slice(releaseUntil);
            release.forEach(chunk => this._write(chunk.chunk, chunk.encoding, chunk.callback));

            if (!this.buffer.length) {
              this.blocked = false;
            }
          }
        } else {
          console.warn(`Unused template: ${template.template}`);
        }
      }

      this.buffer.push(chunkRef);
      return;
    }

    if (this.blocking) {
      const str = chunkRef.chunk = chunk.toString();
      let placeholder = matchPlaceholder(str);

      if (placeholder) {
        // send everything before the placeholder
        this._write(str.substring(0, placeholder.start), encoding, () => {});

        // save placeholder as chunk
        this.buffer.push({
          chunk: str.substring(placeholder.start, placeholder.end),
          encoding,
          template: placeholder.template,
          callback: placeholder.end === str.length ? callback : () => {},
        });
        // update chunkRef
        let remainder = chunkRef.chunk = str.substring(placeholder.end);

        // TODO: push each in between and placeholder as a chunk rather than trying to track location

        // mark other placeholders
        while (remainder.length) {
          placeholder = matchPlaceholder(remainder);
          
          if (!placeholder) {
            this.buffer.push({
              chunk: remainder,
              encoding,
              callback,
            });
            break;
          }

          if (placeholder.start > 0) {
            this.buffer.push({
              chunk: remainder.substring(0, placeholder.start),
              encoding,
              callback: () => {},
            });
          }

          this.buffer.push({
            chunk: remainder.substring(placeholder.start, placeholder.end),
            encoding,
            template: placeholder.template,
            callback: placeholder.end === remainder.length ? callback : () => {},
          });

          remainder = remainder.substring(placeholder.end);
        }

        this.blocked = true;
      } else {
        this.buffer.push(chunkRef);
      }

      return;
    }

    return super._write(chunk, encoding, callback);
  }
}
