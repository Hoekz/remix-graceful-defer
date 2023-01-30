import fs from 'fs/promises';
import path from 'path';

const sessionDir = path.join(process.cwd(), '.session-cache');

export async function markSession(id: string) {
  try {
    await fs.rm(path.join(sessionDir, id));
    return true;
  } catch {
    return false;
  }
}

export async function createSession(id: string) {
  try {
    await fs.writeFile(path.join(sessionDir, id), '');
    return true;
  } catch {
    return false;
  }
}

async function waitForRename(file: string, controller: AbortController) {
  const watcher = fs.watch(file, { signal: controller.signal });

  try {
    for await (const event of watcher) {
      if (event.eventType === 'rename') {
        controller.abort();
        break;
      }
    }
  } catch(e) {
    console.log('waiting had an error', e);
  }
}

export function waitForSession(id: string) {
  const controller = new AbortController();

  return {
    promise: waitForRename(path.join(sessionDir, id), controller),
    cancel: () => controller.abort(),
  };
}
