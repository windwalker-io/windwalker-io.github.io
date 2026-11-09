import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const FIXED_TIME = new Date('2024-01-01T00:00:00Z');
const LINK = /\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const INDEX_NAME = 'llms.md';

export type SkillsPackage = {
  stagingDir: string;
  zipName: string;
  sha256: string;
  fileCount: number;
};

type BuildOptions = {
  srcDir: string;
  // Same markdown set as llms.txt
  files: string[];
  siteUrl: string;
  // llms.txt content with absolute URLs; rewritten to relative links
  index: string;
  stagingDir: string;
};

// `documentation/components/query/where.md` -> `components-query-where.md`
function flatName(file: string): string {
  const path = file
    .replace(/\.md$/, '')
    .replace(/^documentation\//, '')
    .replace(/\/index$/, '') || 'index';

  return `${path.split('/').join('-')}.md`;
}

// Candidate repo paths for a link target, resolved like VitePress clean URLs
function candidates(base: string, path: string): string[] {
  const resolved = path.startsWith('/')
    ? posix.normalize(path.slice(1))
    : posix.normalize(posix.join(posix.dirname(base), path));
  const clean = resolved.replace(/\.html$/, '').replace(/\/$/, '').replace(/\.md$/, '');

  return [`${clean}.md`, `${clean}/index.md`];
}

// Staged layout: <stagingDir>/skills/*.md, skills.zip, skills.zip.sha256
export async function buildSkillsPackage({
  srcDir,
  files,
  siteUrl,
  index,
  stagingDir,
}: BuildOptions): Promise<SkillsPackage> {
  const sourceFiles = [...files].sort();
  const flatByFile = new Map<string, string>();
  const ownerByFlat = new Map<string, string>([[INDEX_NAME, 'generated index']]);

  for (const file of sourceFiles) {
    const name = flatName(file);

    if (ownerByFlat.has(name)) {
      throw new Error(`Skills package name collision: ${ownerByFlat.get(name)} and ${file} both map to ${name}`);
    }

    ownerByFlat.set(name, file);
    flatByFile.set(file, name);
  }

  const pkgDir = join(stagingDir, 'skills');
  const warnings: string[] = [];

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(pkgDir, { recursive: true });

  const rewriteLink = (file: string, label: string, target: string): string => {
    if (SCHEME.test(target) || target.startsWith('#')) {
      return `[${label}](${target})`;
    }

    const hashIndex = target.indexOf('#');
    const path = hashIndex === -1 ? target : target.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? '' : target.slice(hashIndex);
    const flat = candidates(file, path).map((c) => flatByFile.get(c)).find(Boolean);

    if (flat) {
      return `[${label}](./${flat}${fragment})`;
    }

    // Target is outside the package: keep the text, drop the link
    warnings.push(`${file} -> ${target}`);

    return label;
  };

  for (const file of sourceFiles) {
    const text = await readFile(join(srcDir, file), 'utf8');
    const out = text.replace(LINK, (_match, label: string, target: string) =>
      rewriteLink(file, label, target),
    );

    await writeFile(join(pkgDir, flatByFile.get(file)!), out);
  }

  const escapedSiteUrl = siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const indexText = index.replace(
    new RegExp(`${escapedSiteUrl}/([^)\\s]+)`, 'g'),
    (match, file: string) => {
      const flat = flatByFile.get(file);

      if (!flat) {
        warnings.push(`${INDEX_NAME} -> ${file}`);
        return match;
      }

      return `./${flat}`;
    },
  );

  await writeFile(join(pkgDir, INDEX_NAME), indexText);

  if (warnings.length) {
    console.warn(`[skills] Links outside the package were left unresolved:\n  ${warnings.join('\n  ')}`);
  }

  const members = [...flatByFile.values(), INDEX_NAME].sort();

  // Fixed mtimes keep the archive byte-identical for identical content
  await Promise.all(members.map((name) => utimes(join(pkgDir, name), FIXED_TIME, FIXED_TIME)));

  const zipName = 'skills.zip';
  const zipPath = join(stagingDir, zipName);

  await execFileAsync('zip', ['-X', '-D', '-q', zipPath, ...members], { cwd: pkgDir });

  const sha256 = createHash('sha256').update(await readFile(zipPath)).digest('hex');

  await writeFile(join(stagingDir, `${zipName}.sha256`), `${sha256}  ${zipName}\n`);

  return { stagingDir, zipName, sha256, fileCount: members.length };
}
