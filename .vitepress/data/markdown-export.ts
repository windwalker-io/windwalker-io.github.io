import { Plugin } from 'vitepress';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { publicExcludePrefixes } from './excludes';

// Repository root (this file lives in .vitepress/data/)
export const srcDir = join(import.meta.dirname, '../..');

// Public domain: SITE_DOMAIN env var (e.g. `SITE_DOMAIN=example.com yarn build`), else the repository's CNAME file
export const siteUrl = `https://${(process.env.SITE_DOMAIN || readFileSync(join(srcDir, 'CNAME'), 'utf8')).trim()}`;

// Directories never scanned for markdown files
const skipDirs = new Set(['node_modules', '.vitepress', '.git', '.yarn', 'tmp', 'dist']);

// Markdown export options, built once in config.mts and passed to every export entry point
export type MarkdownExclude = string | RegExp;

export type MarkdownExportOptions = {
  // Glob (`*` within a segment, `**` across segments, `?` one char) or RegExp, tested against the path relative to the repository root
  excludes: MarkdownExclude[];
  // Sidebar trees used to link chapter siblings in the Sitemap block
  sidebar: SidebarNode[];
  // Framework sidebar; its nesting becomes the Framework section of llms.txt
  frameworkSidebar: SidebarNode[];
  // Unicorn sidebar; its nesting becomes the Unicorn RAD section of llms.txt
  unicornSidebar: SidebarNode[];
  // Luna sidebar; its nesting becomes the Luna CMF section of llms.txt
  lunaSidebar: SidebarNode[];
};

const globToRegExp = (glob: string) => new RegExp(
  '^' + glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*')
    .replace(/\?/g, '[^/]') + '$',
);

const isMarkdownExcluded = (file: string, excludes: MarkdownExclude[]) => excludes.some((pattern) =>
  typeof pattern === 'string' ? globToRegExp(pattern).test(file) : pattern.test(file),
);

const isPublicMarkdown = (file: string, excludes: MarkdownExclude[]) =>
  !isMarkdownExcluded(file, publicExcludePrefixes) && !isMarkdownExcluded(file, excludes);

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

export function publicMarkdownFiles(options: MarkdownExportOptions): string[] {
  return collectMarkdownFiles().filter((file) => isPublicMarkdown(file, options.excludes));
}

// ---------------------------------------------------------------------------
// llms.txt generation
// ---------------------------------------------------------------------------

const toUrl = (file: string, baseUrl: string) => `${baseUrl}/${file}`;

const humanize = (name: string) =>
  name.split(/[-_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

type MdInfo = { file: string; title: string; description: string };

// Title from frontmatter or the first heading; description from frontmatter only
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

  // Strip link syntax and emphasis markers so the description reads as plain text
  const description = (fm.description ?? '')
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
  ['documentation/unicorn', 'Unicorn RAD'],
  ['documentation/luna', 'Luna CMF'],
];

// Sections whose order and nesting follow a sidebar tree instead of the file system
const sidebarSectionNames = ['Framework', 'Unicorn RAD', 'Luna CMF'];

// Files listed in llms.txt: only those inside a sub-directory, minus excluded prefixes
export function llmsMarkdownFiles(options: MarkdownExportOptions): string[] {
  return publicMarkdownFiles(options).filter(
    (file) => file.includes('/') && !llmsExcludePrefixes.some((prefix) => file.startsWith(prefix)),
  );
}

// H2 section per area; Framework and Unicorn RAD follow their sidebar, other sub-directories become nested lists
export function buildLlmsTxt(options: MarkdownExportOptions, baseUrl: string = siteUrl): string {
  const files = llmsMarkdownFiles(options);
  const infos = new Map(files.map(readMdInfo).map((i) => [i.file, i]));
  const item = (info: MdInfo, indent = '', label = info.title) =>
    `${indent}- [${label}](${toUrl(info.file, baseUrl)})${info.description ? `: ${info.description}` : ''}`;

  // Sidebar tree as nested bullets: group headings are kept as plain labels, item nesting follows.
  // A child that points at its parent's page is replaced by its own children.
  const sidebarBullets = (nodes: SidebarNode[], indent: string, listed: Set<string>): string[] =>
    nodes.flatMap((node) => {
      if (!node.link) {
        const children = sidebarBullets(node.items ?? [], indent + '  ', listed);

        return node.text ? [`${indent}- ${node.text}`, ...children] : children;
      }

      const file = linkToFile(node.link);
      const info = infos.get(file);
      const children = (node.items ?? []).flatMap((child) =>
        child.link && linkToFile(child.link) === file ? (child.items ?? []) : [child],
      );

      if (!info) {
        return sidebarBullets(children, indent, listed);
      }

      listed.add(file);

      // A menu item with children is labeled by its menu text, not by the first child's page title
      const label = children.length ? node.text ?? info.title : info.title;

      return [item(info, indent, label), ...sidebarBullets(children, indent + '  ', listed)];
    });

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

    if (sidebarSectionNames.includes(name)) {
      const listed = new Set<string>();
      const sidebarByName: Record<string, SidebarNode[]> = {
        'Framework': options.frameworkSidebar,
        'Unicorn RAD': options.unicornSidebar,
        'Luna CMF': options.lunaSidebar,
      };
      const sidebar = sidebarByName[name];

      lines.push(`## ${name}`, '');
      lines.push(...sidebarBullets(sidebar, '', listed));

      // Framework pages missing from the sidebar are appended as a flat list
      for (const file of sectionFiles.filter((f) => !listed.has(f)).sort()) {
        lines.push(item(infos.get(file)!));
      }

      lines.push('');
      continue;
    }

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
      const title = indexInfo ? `[${label}](${toUrl(indexInfo.file, baseUrl)})` : label;

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

type SidebarNode = { text?: string; link?: string; items?: SidebarNode[] };
type ChapterItem = { text: string; file: string };
type ChapterList = { title: string; items: ChapterItem[] };

// Route link (e.g. /documentation/components/cache/tagged-pool) to its markdown file
const linkToFile = (link: string) => {
  const path = link.replace(/^\//, '');

  return `${path === '' || path.endsWith('/') ? path + 'index' : path}.md`;
};

const dirOf = (file: string) => file.slice(0, file.lastIndexOf('/'));

// Find the innermost sidebar group that lists the page's sibling chapters (same directory, 2+ pages)
function findChapterList(nodes: SidebarNode[], file: string): ChapterList | undefined {
  for (const node of nodes) {
    if (!node.items?.length) {
      continue;
    }

    const nested = findChapterList(node.items, file);

    if (nested) {
      return nested;
    }

    const siblings = node.items
      .filter((item) => item.link && !item.items?.length)
      .map((item) => ({ text: item.text ?? '', file: linkToFile(item.link!) }))
      .filter((item) => dirOf(item.file) === dirOf(file));

    if (siblings.length >= 2 && siblings.some((item) => item.file === file)) {
      return { title: node.text ?? '', items: siblings };
    }
  }

  return undefined;
}

// Chapter links for the page's sidebar section, shown in the Sitemap block
function chapterSitemap(file: string, sidebar: SidebarNode[], baseUrl: string): string[] {
  const chapters = findChapterList(sidebar, file);

  if (!chapters) {
    return [];
  }

  return [
    `### ${chapters.title}`,
    '',
    ...chapters.items.map((item) =>
      item.file === file ? `- ${item.text} (current page)` : `- [${item.text}](${toUrl(item.file, baseUrl)})`,
    ),
    '',
  ];
}

// Appended to raw markdown only; rendered HTML pages stay unchanged
export function withMarkdownFooter(
  file: string,
  text: string,
  options: MarkdownExportOptions,
  baseUrl: string = siteUrl,
): string {
  const htmlUrl = `${baseUrl}/${file.replace(/\.md$/, '.html')}`;

  return [
    text.replace(/\s*$/, ''),
    '',
    '---',
    '',
    '## Sitemap',
    '',
    `- [All pages index](${baseUrl}/llms.txt)`,
    `- [HTML version of this page](${htmlUrl})`,
    '',
    ...chapterSitemap(file, options.sidebar, baseUrl),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Build output and dev server
// ---------------------------------------------------------------------------

// Runs at buildEnd: copy raw markdown, write llms.txt, and add the skills package
export function exportMarkdownAndLlmsTxt(outDir: string, skillsStagingDir: string, options: MarkdownExportOptions) {
  const files = publicMarkdownFiles(options);

  for (const file of files) {
    const target = join(outDir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, withMarkdownFooter(file, readFileSync(join(srcDir, file), 'utf8'), options));
  }

  writeFileSync(join(outDir, 'llms.txt'), buildLlmsTxt(options));
  cpSync(skillsStagingDir, outDir, { recursive: true });
}

// Serve llms.txt and raw markdown files during `yarn dev`
// Links point at the host the request came in on (e.g. http://localhost:5173)
const devBaseUrl = (host: string | undefined) => (host ? `http://${host}` : siteUrl);

// Single entry point for markdown options: dev middleware here, build output via exportMarkdownAndLlmsTxt
export function markdownExportPlugin(options: MarkdownExportOptions): Plugin {
  return {
    name: 'markdown-export',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent((req.url ?? '').split('?')[0]);

        if (pathname === '/llms.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(buildLlmsTxt(options, devBaseUrl(req.headers.host)));
          return;
        }

        const file = pathname.slice(1);
        // Vite requests page modules as `.md` with a `script` fetch destination.
        // Only serve raw text to documents and plain clients (not module imports).
        const dest = req.headers['sec-fetch-dest'];
        const isModuleRequest = (req.url ?? '').includes('?') || (dest !== undefined && dest !== 'document');

        if (!isModuleRequest && file.endsWith('.md')) {
          if (publicMarkdownFiles(options).includes(file)) {
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.end(withMarkdownFooter(file, readFileSync(join(srcDir, file), 'utf8'), options, devBaseUrl(req.headers.host)));
            return;
          }

          // Excluded markdown is not served as raw text in dev either, matching the build output
          if (existsSync(join(srcDir, file))) {
            res.statusCode = 404;
            res.end('Not Found');
            return;
          }
        }

        next();
      });
    },
  };
}
