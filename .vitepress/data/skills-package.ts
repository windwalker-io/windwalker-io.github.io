import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const SKILLS_DIR = '.github/skills';
const FIXED_TIME = new Date('2024-01-01T00:00:00Z');
const LINK = /\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export type SkillInfo = { title: string; description: string };

export type SkillsPackage = {
  stagingDir: string;
  zipName: string;
  sha256: string;
  fileCount: number;
};

type BuildOptions = {
  srcDir: string;
  // Markdown files that already passed the shared public-file restrictions
  files: string[];
  stagingDir: string;
  describe: (file: string) => Promise<SkillInfo>;
};

// Flatten `<dir>/README.md` into `<dir>.md`, other files keep their name
function flatName(file: string): string {
  const parts = file.slice(SKILLS_DIR.length + 1).split('/');
  const name = parts[parts.length - 1];

  return name === 'README.md' && parts.length > 1
    ? `${parts[parts.length - 2]}.md`
    : name;
}

// Staged layout: <stagingDir>/skills/*.md, skills.zip, skills.zip.sha256
export async function buildSkillsPackage({
  srcDir,
  files,
  stagingDir,
  describe,
}: BuildOptions): Promise<SkillsPackage> {
  const skillFiles = files.filter((file) => file.startsWith(SKILLS_DIR + '/')).sort();
  const flatByFile = new Map<string, string>();
  const fileByFlat = new Map<string, string>([['skills.md', 'generated index']]);

  for (const file of skillFiles) {
    const name = flatName(file);

    if (fileByFlat.has(name)) {
      throw new Error(`Skills package name collision: ${fileByFlat.get(name)} and ${file} both map to ${name}`);
    }

    fileByFlat.set(name, file);
    flatByFile.set(file, name);
  }

  const pkgDir = join(stagingDir, 'skills');
  const warnings: string[] = [];

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(pkgDir, { recursive: true });

  const rewriteLink = (file: string, label: string, target: string): string => {
    // External URLs, same-page anchors: keep as they are
    if (SCHEME.test(target) || target.startsWith('#')) {
      return `[${label}](${target})`;
    }

    const hashIndex = target.indexOf('#');
    const path = hashIndex === -1 ? target : target.slice(0, hashIndex);
    const fragment = hashIndex === -1 ? '' : target.slice(hashIndex);
    const resolved = posix.normalize(posix.join(posix.dirname(file), path));
    const flat = flatByFile.get(resolved);

    if (flat) {
      return `[${label}](./${flat}${fragment})`;
    }

    // Target is outside the public package: keep the text, drop the link
    warnings.push(`${file} -> ${target}`);

    return label;
  };

  for (const file of skillFiles) {
    const text = await readFile(join(srcDir, file), 'utf8');
    const out = text.replace(LINK, (_match, label: string, target: string) =>
      rewriteLink(file, label, target),
    );

    await writeFile(join(pkgDir, flatByFile.get(file)!), out);
  }

  if (warnings.length) {
    console.warn(`[skills] Links to files outside the skills package were unlinked:\n  ${warnings.join('\n  ')}`);
  }

  const entries: string[] = [];

  for (const file of skillFiles) {
    const info = await describe(file);
    entries.push(`- [${info.title}](./${flatByFile.get(file)})${info.description ? `: ${info.description}` : ''}`);
  }

  await writeFile(join(pkgDir, 'skills.md'), [
    '# Windwalker Agent Skills',
    '',
    '> Markdown copies of the Windwalker agent skills. Links are relative to this directory.',
    '',
    ...entries,
    '',
  ].join('\n'));

  const members = [...flatByFile.values(), 'skills.md'].sort();

  // Fixed mtimes keep the archive byte-identical for identical content
  await Promise.all(members.map((name) => utimes(join(pkgDir, name), FIXED_TIME, FIXED_TIME)));

  const zipName = 'skills.zip';
  const zipPath = join(stagingDir, zipName);

  await execFileAsync('zip', ['-X', '-D', '-q', zipPath, ...members], { cwd: pkgDir });

  const sha256 = createHash('sha256').update(await readFile(zipPath)).digest('hex');

  await writeFile(join(stagingDir, `${zipName}.sha256`), `${sha256}  ${zipName}\n`);

  return { stagingDir, zipName, sha256, fileCount: members.length };
}
