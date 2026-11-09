import type { Plugin } from 'vitepress';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';

export const siteUrl = 'https://windwalker.io';
const skipDirs = new Set(['node_modules', '.vitepress', '.git', '.yarn', 'tmp', 'dist']);
export const srcDir = join(import.meta.dirname, '../..');

// Shared compile restrictions: every public output (pages, raw markdown, llms.txt, skills) uses these
export const publicExcludePrefixes = ['tmp/'];
const isPublicMarkdown = (file: string) => !publicExcludePrefixes.some((prefix) => file.startsWith(prefix));

async function collectMarkdownFiles(dir: string = srcDir): Promise<string[]> {
  const files: string[] = [];

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        files.push(...await collectMarkdownFiles(join(dir, entry.name)));
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative(srcDir, join(dir, entry.name)).split(sep).join('/'));
    }
  }

  return files.sort();
}

export async function publicMarkdownFiles(): Promise<string[]> {
  return (await collectMarkdownFiles()).filter(isPublicMarkdown);
}

const toUrl = (file: string) => `${siteUrl}/${file}`;

const humanize = (name: string) =>
  name.split(/[-_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

type MdInfo = { file: string; title: string; description: string };

async function readMdInfo(file: string): Promise<MdInfo> {
  const text = await readFile(join(srcDir, file), 'utf8');
  const fm: Record<string, string> = {};
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const body = fmMatch ? text.slice(fmMatch[0].length) : text;

  for (const line of fmMatch?.[1].split('\n') ?? []) {
    const kv = line.match(/^(\w+):\s*(.*)$/);

    if (kv) {
      fm[kv[1]] = kv[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }

  const heading = body.match(/^#\s+(.+)$/m)?.[1].trim();
  const paragraph = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !/^(#|<|```|-|\*|\||>|!|\{|import |export )/.test(line)) ?? '';

  const description = (fm.description || paragraph)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*`]/g, '')
    .slice(0, 200);

  return {
    file,
    title: fm.title || heading || basename(file, '.md'),
    description,
  };
}

const llmsExcludePrefixes = ['.github/'];

const sectionNames: [prefix: string, name: string][] = [
  ['documentation/guides', 'Guides'],
  ['documentation/components', 'Components'],
  ['documentation/framework', 'Framework'],
];

// Build llms.txt: H2 sections per area, nested lists per sub-directory
export async function llmsMarkdownFiles(): Promise<string[]> {
  return (await publicMarkdownFiles()).filter(
    (file) => file.includes('/') && !llmsExcludePrefixes.some((prefix) => file.startsWith(prefix)),
  );
}

// Build llms.txt: H2 sections per area, nested lists per sub-directory
export async function buildLlmsTxt(): Promise<string> {
  const files = await llmsMarkdownFiles();
  const infos = new Map((await Promise.all(files.map(readMdInfo))).map((i) => [i.file, i]));
  const item = (info: MdInfo, indent = '') =>
    `${indent}- [${info.title}](${toUrl(info.file)})${info.description ? `: ${info.description}` : ''}`;

  const lines = [
    '# Windwalker PHP Framework',
    '',
    '> The Next Generation PHP Framework',
    '',
  ];

  const sections = new Map<string, string[]>();

  for (const file of files) {
    const section = sectionNames.find(([prefix]) => file.startsWith(prefix + '/'));
    const key = section ? section[1] : 'Other';
    sections.set(key, [...(sections.get(key) ?? []), file]);
  }

  const order = [...sectionNames.map(([, name]) => name), 'Other'];

  for (const name of order) {
    const sectionFiles = sections.get(name);

    if (!sectionFiles) {
      continue;
    }

    const prefix = sectionNames.find(([, n]) => n === name)?.[0] ?? '';
    const direct: string[] = [];
    const groups = new Map<string, string[]>();

    for (const file of sectionFiles) {
      const rest = prefix ? file.slice(prefix.length + 1) : file;
      const parts = rest.split('/');

      if (parts.length === 1) {
        direct.push(item(infos.get(file)!));
      } else {
        groups.set(parts[0], [...(groups.get(parts[0]) ?? []), file]);
      }
    }

    lines.push(`## ${name}`, '', ...direct);

    for (const [dir, groupFiles] of groups) {
      const groupBase = prefix ? `${prefix}/${dir}` : dir;
      const indexInfo = infos.get(`${groupBase}/index.md`);
      const label = humanize(dir);
      const title = indexInfo ? `[${label}](${toUrl(indexInfo.file)})` : label;

      lines.push(`- ${title}`);

      for (const file of groupFiles.sort()) {
        if (file !== `${groupBase}/index.md`) {
          lines.push(item(infos.get(file)!, '  '));
        }
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

// Copy every public markdown file into the build output, write llms.txt and the skills package
export async function exportMarkdownAndLlmsTxt(outDir: string, skillsStagingDir: string) {
  const files = await publicMarkdownFiles();

  for (const file of files) {
    const target = join(outDir, file);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(srcDir, file), target);
  }

  await writeFile(join(outDir, 'llms.txt'), await buildLlmsTxt());
  await cp(skillsStagingDir, outDir, { recursive: true });
}

// Serve llms.txt and raw markdown files during `yarn dev`
export function markdownExportPlugin(): Plugin {
  return {
    name: 'markdown-export',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = decodeURIComponent((req.url ?? '').split('?')[0]);

        if (pathname === '/llms.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(await buildLlmsTxt());
          return;
        }

        const file = pathname.slice(1);
        // Vite requests page modules as `.md` with `script` fetch destination; only serve raw text to documents and plain clients
        const dest = req.headers['sec-fetch-dest'];
        const isModuleRequest = (req.url ?? '').includes('?') || (dest !== undefined && dest !== 'document');

        if (!isModuleRequest && file.endsWith('.md') && (await publicMarkdownFiles()).includes(file)) {
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          res.end(await readFile(join(srcDir, file)));
          return;
        }

        next();
      });
    },
  };
}
