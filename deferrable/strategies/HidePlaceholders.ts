import type { Template, Placeholder } from '../utils/matchers';
import { ReplacePlaceholders } from './ReplacePlaceholders';

const noop = () => {};

const hidePlaceholder = (id: string) => `<style>template[id="B:${id}"] + *{display:none;}</style>`;

export class HidePlaceholders extends ReplacePlaceholders {
  handlePlaceholder(chunk: string, encoding: BufferEncoding, placeholder: Placeholder): void {
    if (!this.buffer.length) {
      super._write(chunk.substring(placeholder.start, placeholder.end), encoding, noop);  
    } else {
      this.buffer.push({ chunk: chunk.substring(placeholder.start, placeholder.end), encoding, callback: noop });
    }

    this.buffer.push({
      chunk: '',
      encoding,
      template: placeholder.template,
      callback: noop,
    });

  }

  substituteTemplate(template: Template): void {
    const placeholder = this.buffer.find(chunk => chunk.template === template.template);

    if (!placeholder) {
      return console.warn(`Unable to find placeholder for template: ${template.template}`);
    }

    placeholder.chunk = hidePlaceholder(template.template) + template.html;

    if (placeholder === this.buffer[0]) {
      this.releaseUntilNextPlaceholder();
    }
  }
}
