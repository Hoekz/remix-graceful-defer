import { PassThrough } from 'stream';

const START = (id: string) => (
  `<!DOCTYPE html><html lang="en"><head><script id="remix-enable-js" data-session="${id}" lang="javascript">fetch('/enable-js?s=${id}')</script>`
);

type DeferrableStreamState = 'empty' | 'staged' | 'streaming';

export class DeferrablePassThrough extends PassThrough {
  id: string;
  state: DeferrableStreamState;
  start: string;

  constructor(id?: string) {
    super();
    this.id = id || Math.floor(Math.random() * 0xFFFFFFFFFFFF).toString(16);
    this.state = 'empty';
    this.start = START(this.id);
  }

  prewrite() {
    if (this.state === 'empty') {
      this.write(this.start);
      this.state = 'staged';
    }
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null, data?: any) => void) {
    if (this.state === 'staged') {
      chunk = chunk.toString().slice(this.start.length);
    }

    this.state = 'streaming';

    console.log('---------CHUNK----------');
    console.log(chunk.toString());
    console.log('------------------------');
    super._transform(chunk, encoding, callback);
  }
}

export class CharacterRange {
  start: number;
  end: number;
  min: number;
  max: number;

  constructor(start: string, end: string, min: number, max: number) {
    this.start = start.charCodeAt(0);
    this.end = end.charCodeAt(0);
    this.min = min;
    this.max = max;
  }

  match(target: Buffer) {
    for (let i = 0; i < this.max; i++) {
      if (target[i]) {

      }
    }

    return this.max;
  }
}

export class BufferPattern {
  parts: (string | CharacterRange)[];

  constructor(...parts: (string | CharacterRange)[]) {
    this.parts = parts;
  }
}

export class BlockablePassThrough extends PassThrough {
  id: string;
  buffer: string[] = [];

  constructor(id?: string) {
    super();
    this.id = id || Math.floor(Math.random() * 0xFFFFFFFFFFFF).toString(16);
  }
}
