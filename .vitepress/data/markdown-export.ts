import type { Plugin } from 'vitepress';
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';

// Repository root (this file lives in .vitepress/data/)
export const srcDir = join(import.meta.dirname, '../..');

// Public domain, read from the repository's CNAME file (single source of truth)
export const siteUrl = `https://${readFileSync(join(srcDir, 'CNAME'), 'utf8').trim()}`;

// Directories never scanned for markdown files
const skipDirs = new Set(['node_modules', '.vitepress', '.git', '.yarn', 'tmp', 'dist']);

// Shared compile restrictions: every public output (pages, raw markdown, llms.txt, skills) uses these
export const publicExcludePrefixes = ['tmp/'];
const isPublicMarkdown = (file: string) => !publicExcludePrefixes.some((prefix) => file.startsWith(prefix));

// ---------------------------------------------------------------------------
// Markdown file discovery
// ---------------------------------------------------------------------------

// Recursively collect every `.md` file as a POSIX-style path relative to srcDir
function collectMarkdownFiles(dir: string = srcDir): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        files.push(...collectMarkdownFiles(join(dir, entry.name)));
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative(srcDir, join(dir, entry.name)).split(sep).join('/'));
    }
  }

  return files.sort();
}

export function publicMarkdownFiles(): string[] {
  return collectMarkdownFiles().filter(isPublicMarkdown);
}

// ---------------------------------------------------------------------------
// llms.txt generation
// ---------------------------------------------------------------------------

const toUrl = (file: string) => `${siteUrl}/${file}`;

const humanize = (name: string) =>
  name.split(/[-_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

type MdInfo = { file: string; title: string; description: string };

// Read title and description from frontmatter, falling back to the first heading and paragraph
function readMdInfo(file: string): MdInfo {
  const text = readFileSync(join(srcDir, file), 'utf8');
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
  // First line that is plain prose; skips headings, markup, code fences, lists, and imports
  const paragraph = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !/^(#|<|```|-|\*|\||>|!|\{|import |export )/.test(line)) ?? '';

  // Strip link syntax and emphasis markers so the description reads as plain text
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

// Files excluded from llms.txt (but still exported as raw markdown)
const llmsExcludePrefixes = ['.github/'];

// Top-level areas grouped as H2 sections in llms.txt, in display order
const sectionNames: [prefix: string, name: string][] = [
  ['documentation/guides', 'Guides'],
  ['documentation/components', 'Components'],
  ['documentation/framework', 'Framework'],
];

// Files listed in llms.txt: only those inside a sub-directory, minus excluded prefixes
export function llmsMarkdownFiles(): string[] {
  return publicMarkdownFiles().filter(
    (file) => file.includes('/') && !llmsExcludePrefixes.some((prefix) => file.startsWith(prefix)),
  );
}

// H2 section per area; sub-directories become nested lists, linked through their index.md
export function buildLlmsTxt(): string {
  const files = llmsMarkdownFiles();
  const infos = new Map(files.map(readMdInfo).map((i) => [i.file, i]));
  const item = (info: MdInfo, indent = '') =>
    `${indent}- [${info.title}](${toUrl(info.file)})${info.description ? `: ${info.description}` : ''}`;

  const lines = [
    '# Windwalker PHP Framework',
    '',
    '> The Next Generation PHP Framework',
    '',
  ];

  // Bucket each file under its section; anything outside the known sections goes to "Other"
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

    // Direct files are listed as-is; deeper files are grouped under their first sub-directory
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

// ---------------------------------------------------------------------------
// Raw markdown output
// ---------------------------------------------------------------------------

// Appended to raw markdown only; rendered HTML pages stay unchanged
export function withMarkdownFooter(file: string, text: string): string {
  const htmlUrl = `${siteUrl}/${file.replace(/\.md$/, '.html')}`;

  return `${text.replace(/\s*$/, '')}

---

## Sitemap

- [All pages index](${siteUrl}/llms.txt)
- [HTML version of this page](${htmlUrl})

`;
}

// ---------------------------------------------------------------------------
// Build output and dev server
// ---------------------------------------------------------------------------

// Runs at buildEnd: copy raw markdown, write llms.txt, and add the skills package
export function exportMarkdownAndLlmsTxt(outDir: string, skillsStagingDir: string) {
  const files = publicMarkdownFiles();

  for (const file of files) {
    const target = join(outDir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, withMarkdownFooter(file, readFileSync(join(srcDir, file), 'utf8')));
  }

  writeFileSync(join(outDir, 'llms.txt'), buildLlmsTxt());
  cpSync(skillsStagingDir, outDir, { recursive: true });
}

// Serve llms.txt and raw markdown files during `yarn dev`
export function markdownExportPlugin(): Plugin {
  return {
    name: 'markdown-export',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent((req.url ?? '').split('?')[0]);

        if (pathname === '/llms.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(buildLlmsTxt());
          return;
        }

        const file = pathname.slice(1);
        // Vite requests page modules as `.md` with a `script` fetch destination.
        // Only serve raw text to documents and plain clients (not module imports).
        const dest = req.headers['sec-fetch-dest'];
        const isModuleRequest = (req.url ?? '').includes('?') || (dest !== undefined && dest !== 'document');

        if (!isModuleRequest && file.endsWith('.md') && publicMarkdownFiles().includes(file)) {
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          res.end(withMarkdownFooter(file, readFileSync(join(srcDir, file), 'utf8')));
          return;
        }

        next();
      });
    },
  };
}
