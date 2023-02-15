import { Abortable } from 'events';
import { Mode, ObjectEncodingOptions, OpenMode } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Stream } from 'stream';

export async function removeFile(filePath: string): Promise<void> {
  return fs.rm(filePath, { recursive: true, force: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);

    return stat.isFile();
  } catch (error) {
    return false;
  }
}

export function checkPath(pth: string) {
  if (process.platform === 'win32') {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path.parse(pth).root, ''));

    if (pathHasInvalidWinCharacters) {
      const error = new Error(`Path contains invalid characters: ${pth}`);
      error.code = 'EINVAL';
      throw error;
    }
  }
}

export async function makeDir(dir: string, mode = 0o777) {
  checkPath(dir);
  return fs.mkdir(dir, {
    mode,
    recursive: true,
  });
}

export async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function outputFile(
  file: string,
  data: string
    | NodeJS.ArrayBufferView
    | Iterable<string
    | NodeJS.ArrayBufferView>
    | AsyncIterable<string | NodeJS.ArrayBufferView>
    | Stream,
  encoding?:
      | (ObjectEncodingOptions & {
            mode?: Mode | undefined;
            flag?: OpenMode | undefined;
        } & Abortable)
      | BufferEncoding
      | null,
) {
  const dir = path.dirname(file);
  if (!await pathExists(dir)) {
    await makeDir(dir);
  }
  return fs.writeFile(file, data, encoding);
}