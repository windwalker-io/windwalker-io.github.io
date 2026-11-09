import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const FIXED_TIME = new Date('2024-01-01T00:00:00Z');
const LINK = /\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const INDEX_NAME = 'README.md';

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

// `documentation/components/attributes/index.md` -> `components/attributes/index.md`
function packagePath(file: string): string {
  return file.replace(/^documentation\//, '');
}

// Candidate repo paths for a link target, resolved like VitePress clean URLs
function candidates(base: string, path: string): string[] {
  const resolved = path.startsWith('/')
    ? posix.normalize(path.slice(1))
    : posix.normalize(posix.join(posix.dirname(base), path));
  const clean = resolved.replace(/\.html$/, '').replace(/\/$/, '').replace(/\.md$/, '');

  return [`${clean}.md`, `${clean}/index.md`];
}

// Relative link from a directory inside the package to a file inside it
function relativeLink(fromDir: string, to: string): string {
  const rel = posix.relative(fromDir, to);

  return rel.startsWith('.') ? rel : `./${rel}`;
}

// Staged layout: <stagingDir>/skills/<nested paths>.md, skills.zip, skills.zip.sha256
export async function buildSkillsPackage({
  srcDir,
  files,
  siteUrl,
  index,
  stagingDir,
}: BuildOptions): Promise<SkillsPackage> {
  const sourceFiles = [...files].sort();
  const outByFile = new Map<string, string>(sourceFiles.map((file) => [file, packagePath(file)]));

  if (new Set(outByFile.values()).size !== outByFile.size || outByFile.has(INDEX_NAME)) {
    throw new Error('Skills package path collision');
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
    const linked = candidates(file, path).find((c) => outByFile.has(c));

    if (linked) {
      const link = relativeLink(dirname(outByFile.get(file)!), outByFile.get(linked)!);

      return `[${label}](${link}${fragment})`;
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
    const dest = join(pkgDir, outByFile.get(file)!);

    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, out);
  }

  const escapedSiteUrl = siteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const indexText = index.replace(
    new RegExp(`${escapedSiteUrl}/([^)\\s]+)`, 'g'),
    (match, file: string) => {
      const out = outByFile.get(file);

      if (!out) {
        warnings.push(`${INDEX_NAME} -> ${file}`);
        return match;
      }

      return relativeLink(dirname(INDEX_NAME), out);
    },
  );

  await writeFile(join(pkgDir, INDEX_NAME), indexText);

  if (warnings.length) {
    console.warn(`[skills] Links outside the package were left unresolved:\n  ${warnings.join('\n  ')}`);
  }

  const members = [...outByFile.values(), INDEX_NAME].sort();

  // Fixed mtimes keep the archive byte-identical for identical content
  await Promise.all(members.map((name) => utimes(join(pkgDir, name), FIXED_TIME, FIXED_TIME)));

  const zipName = 'skills.zip';
  const zipPath = join(stagingDir, zipName);

  await execFileAsync('zip', ['-X', '-D', '-q', zipPath, ...members], { cwd: pkgDir });

  const sha256 = createHash('sha256').update(await readFile(zipPath)).digest('hex');

  await writeFile(join(stagingDir, `${zipName}.sha256`), `${sha256}  ${zipName}\n`);

  return { stagingDir, zipName, sha256, fileCount: members.length };
}
