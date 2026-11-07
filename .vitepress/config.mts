import { defineConfig, type Plugin } from 'vitepress'
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';
import { flatComponents, getComponentsSidebar } from './data/components';
import { guidesSidebar } from './data/guides';
import { componentRoutePrefix, guideRoutePrefix } from './store/routing-store';

const siteUrl = 'https://windwalker.io';
const skipDirs = new Set(['node_modules', '.vitepress', '.git', '.yarn', 'tmp', 'dist']);
const srcDir = join(import.meta.dirname, '..');

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
async function buildLlmsTxt(): Promise<string> {
  const files = (await collectMarkdownFiles()).filter(
    (file) => file.includes('/') && !llmsExcludePrefixes.some((prefix) => file.startsWith(prefix)),
  );
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

// Copy every source markdown file into the build output and write llms.txt
async function exportMarkdownAndLlmsTxt(outDir: string) {
  const files = await collectMarkdownFiles();

  for (const file of files) {
    const target = join(outDir, file);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(srcDir, file), target);
  }

  await writeFile(join(outDir, 'llms.txt'), await buildLlmsTxt());
}

// Serve llms.txt and raw markdown files during `yarn dev`
function markdownExportPlugin(): Plugin {
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

        if (!isModuleRequest && file.endsWith('.md') && (await collectMarkdownFiles()).includes(file)) {
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          res.end(await readFile(join(srcDir, file)));
          return;
        }

        next();
      });
    },
  };
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  vite: {
    plugins: [markdownExportPlugin()],
  },
  buildEnd: async (siteConfig) => {
    await exportMarkdownAndLlmsTxt(siteConfig.outDir);
  },
  title: "Windwalker PHP Framework",
  description: "The Next Generation PHP Framework",
  appearance: 'force-dark',
  head: [
    // Links
    ['link', { rel: 'icon', href: '/images/logo-icon.png' }],

    // Meta
    ['meta', { property: 'og:image', content: 'https://repository-images.githubusercontent.com/15371097/87e3e600-736d-11e9-9c49-64382cf43093' }],

    // Scripts
    ['script', { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-MYMEG7N4RV' }],
    ['script', {}, `  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-MYMEG7N4RV');`],
  ],
  themeConfig: {
    logo: "/images/logo-cw-h.svg",
    siteTitle: false,
    editLink: {
      pattern: 'https://github.com/windwalker-io/windwalker-io.github.io/blob/master/:path'
    },

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Documentations',
        items: [
          { text: 'Guide', link: `/${guideRoutePrefix}/start/` },
          { text: 'Framework', link: '#' },
          { text: 'Components', link: `/${componentRoutePrefix}/` },
        ]
      },
      { text: 'Unicorn RAD', link: '#' },
      { text: 'Status', link: 'status' },
      { text: 'Others', link: '#' },
    ],

    sidebar: {
      [`/${guideRoutePrefix}`]: guidesSidebar.value,
      [`/${componentRoutePrefix}`]: await getComponentsSidebar(),
    },

    // sidebar: [
    //   {
    //     text: 'Examples',
    //     items: [
    //       { text: 'Markdown Examples', link: '/markdown-examples' },
    //       { text: 'Runtime API Examples', link: '/api-examples' }
    //     ]
    //   }
    // ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/windwalker-io/framework/' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://simular.co/" target="_blank">Simular Inc.</a>.`
    }
  },
  transformPageData(pageData, { siteConfig }) {
    if (pageData.frontmatter?.component) {
      const component = flatComponents.value
        .find((com) => com.alias === pageData.frontmatter?.component);

      pageData.titleTemplate = `:title | ${component?.title} Component | ${siteConfig.site.title}`;
    }
  }
})
