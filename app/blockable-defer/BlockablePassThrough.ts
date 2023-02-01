import { PassThrough } from 'stream';
import { matchPlaceholder, matchTemplate } from './pattern';

interface Chunk {
  chunk: any;
  encoding: BufferEncoding;
  template?: string;
  callback: (error?: Error | null | undefined) => void;
}

const noop = () => {};

export class BlockablePassThrough extends PassThrough {
  id: string;
  private blocking: boolean;
  private blocked: boolean = false;
  private buffer: Chunk[] = [];

  constructor(id?: string, blocking?: boolean) {
    super();
    this.id = id || Math.floor(Math.random() * 0xFFFFFFFFFFFF).toString(16);
    this.blocking = blocking ?? false;
  }

  block() {
    this.blocking = true;
  }

  unblock() {
    this.blocking = false;

    if (this.blocked) {
      this.flushBuffer();
    }
  }

  private flushBuffer() {
    if (!this.blocked) return;
    this.blocked = false;

    for (const chunk of this.buffer) {
      console.log('-------FLUSH----------');
      // console.log(chunk.chunk);
      super._write(chunk.chunk, chunk.encoding, chunk.callback);
    }

    this.buffer = [];
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
            release.forEach(chunk => super._write(chunk.chunk, chunk.encoding, chunk.callback));

            if (!this.buffer.length) {
              this.blocked = false;
            }

            callback();
            return;
          }
        } else {
          console.warn(`Unused template: ${template.template}`);
        }
      }

      this.buffer.push({ chunk: str, encoding, callback: noop });
      callback();
      return;
    }

    if (this.blocking) {
      const str = chunkRef.chunk = chunk.toString();
      // console.log(str);
      let placeholder = matchPlaceholder(str);

      if (!placeholder) {
        console.log('-----NO PLACEHOLDER-----');
        // console.log(str);
        return super._write(chunk, encoding, callback);
      }

      // send everything before the placeholder
      console.log('-----BEFORE PLACEHOLDER-----');
      // console.log(str.substring(0, placeholder.start));
      super._write(str.substring(0, placeholder.start), encoding, noop);

      // save placeholder as chunk
      this.buffer.push({
        chunk: str.substring(placeholder.start, placeholder.end),
        encoding,
        template: placeholder.template,
        callback: noop,
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
            callback: noop,
          });
          break;
        }

        if (placeholder.start > 0) {
          this.buffer.push({
            chunk: remainder.substring(0, placeholder.start),
            encoding,
            callback: noop,
          });
        }

        this.buffer.push({
          chunk: remainder.substring(placeholder.start, placeholder.end),
          encoding,
          template: placeholder.template,
          callback: noop,
        });

        remainder = remainder.substring(placeholder.end);
      }

      this.blocked = true;

      callback();
      return;
    }

    console.log(!this.blocking ? '-------PASS THROUGH---------' : '-------BEFORE BLOCKING------');
    // console.log(chunk.toString());

    return super._write(chunk, encoding, callback);
  }
}
