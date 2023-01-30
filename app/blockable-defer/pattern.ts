const pStart = '<!--$?-->';
const pEnd = '<!--/$-->';
const pBeforeIndex = '<template id="B:';
const pAfterIndex = '"></template>';

export function matchPlaceholder(chunk: string, offset?: number) {
  const placeholderStart = chunk.indexOf(pStart, offset);
  if (placeholderStart === -1) return null;

  const placeholderEnd = chunk.indexOf(pEnd, placeholderStart + pStart.length);
  const before = chunk.indexOf(pBeforeIndex, placeholderStart + pStart.length);
  const after = chunk.indexOf(pAfterIndex, before);

  return {
    start: placeholderStart + pStart.length,
    end: placeholderEnd,
    template: chunk.substring(before + pBeforeIndex.length, after),
  };
}

const tStart = '<div hidden id="S:';
const tEnd = '<script>';
const tClose = '</div>';
const tAfterIndex = '">';

export function matchTemplate(chunk: string, offset?: number) {
  const templateStart = chunk.indexOf(tStart, offset);
  if (templateStart === -1) return null;

  const templateEnd = chunk.indexOf(tEnd, templateStart);
  const after = chunk.indexOf(tAfterIndex, templateStart);

  return {
    start: templateStart,
    end: templateEnd,
    template: chunk.substring(templateStart + tStart.length, after),
    html: chunk.substring(after + tAfterIndex.length, templateEnd - tClose.length), 
  }
}
