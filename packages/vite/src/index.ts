import path from 'path';
import * as vite from 'vite';
import oasal from 'oasal';
import * as babel from '@babel/core';
import * as fs from 'fs/promises';
import typescriptPreset from '@babel/preset-typescript';
import EntryMap from './entry-map';
import { fileExists, outputFile } from './fs';

const ARTIFACT = '.oasal';

function getPOSIXPath(file: string): string {
  return file.replaceAll(path.sep, path.posix.sep);
}

const CLIENT_ENTRY = '@oasal';
const DEFAULT_SERVER_FILTER = /\.[mc]?[tj]sx?$/;
const DEFAULT_CLIENT_FILTER = /\.client\.[mc]?[tj]sx?$/;

export interface ComponentFilter {
  server?: RegExp;
  client?: RegExp;
}

export interface OasalPluginOptions {
  filter?: ComponentFilter;
  integration: string;
}

export default function oasalPlugin(
  options: OasalPluginOptions,
): vite.Plugin {
  const serverFilter = options.filter?.server ?? DEFAULT_SERVER_FILTER;
  const clientFilter = options.filter?.client ?? DEFAULT_CLIENT_FILTER;

  const entries = new EntryMap();
  const artifact = path.join(process.cwd(), ARTIFACT);

  return {
    name: 'oasal',
    enforce: 'pre',
    async config(config, env) {
      if (await fileExists(artifact)) {
        const file = await fs.readFile(
          artifact,
          'utf-8',
        );
        entries.parse(file);
      }
    },
    async buildEnd() {
      await outputFile(artifact, entries.stringify());
    },
    resolveId(id, importer) {
      if (id.startsWith('\0')) {
        return null;
      }
      if (importer) {
        if (serverFilter.test(id)) {
          return path.join(importer, id);
        }
        if (clientFilter.test(id)) {
          return path.join(importer, id);
        }
      }
      return null;
    },
    load(id, opts) {
      if (id.startsWith('\0')) {
        return null;
      }
      if (opts?.ssr && serverFilter.test(id)) {
        return fs.readFile(id, 'utf-8');
      }
      if (id === CLIENT_ENTRY) {
        
      }
      return null;
    },
    async transform(code, id) {
      if (id.startsWith('\0')) {
        return null;
      }
      if (serverFilter.test(id)) {
        const result = await babel.transformAsync(code, {
          presets: [
            [typescriptPreset],
          ],
          plugins: [
            [oasal, {
              integration: options?.integration,
              filter: clientFilter,
            }],
          ],
          filename: path.basename(id),
          sourceMaps: 'inline',
        });

        if (result) {
          return {
            code: result.code ?? undefined,
            map: result.map ?? undefined,
          };
        }
      }
      return null;
    },
  };
}
