---
layout: doc
title: Download Agent Skills
description: Download the Windwalker agent skills as a zip archive and verify its SHA-256 checksum.
---

# Download Agent Skills

The Windwalker agent skills are published with every site build as a zip archive. The archive contains flat Markdown files, and every link inside them is relative, so the directory can be copied into any project as it is.

<ul>
  <li><a href="/llms.txt">llms.txt</a>: the online documentation index for LLMs</li>
  <li><a href="/skills.zip">skills.zip</a>: the archive</li>
  <li><a href="/skills.zip.sha256">skills.zip.sha256</a>: the checksum file</li>
  <li><a href="/skills/skills.md">skills/skills.md</a>: the index, same entry point style as <code>llms.txt</code></li>
</ul>

## Checksum

The archive built with this site has the following SHA-256 checksum:

<code class="skills-sha256">{{ sha256 }}</code>

The archive contains {{ fileCount }} Markdown files.

Download, verify, and extract the archive in one command. The command stops before extraction if the checksum does not match:

```bash
SHA=__SKILLS_SHA256__
curl -fsSLO https://windwalker.io/skills.zip &&
  echo "$SHA  skills.zip" | { sha256sum -c || shasum -a 256 -c; } &&
  unzip -q skills.zip -d skills
```

The checksum step prints `skills.zip: OK` when the archive matches. Then the files are in `./skills/`, starting with `skills/skills.md`.

::: info
The checksum and the archive come from the same site, so this check detects a corrupted or incomplete download. It does not prove that the archive was not replaced on the server.
:::

<script setup>
const sha256 = __SKILLS_SHA256__
const fileCount = __SKILLS_FILE_COUNT__
</script>
