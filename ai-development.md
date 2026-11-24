---
layout: doc
title: AI Development
description: Download the Windwalker agent skills and use the Windwalker documentation APIs from AI tools.
---

# AI Development

Windwalker publishes its documentation for AI agents in two ways. The agent skills are a zip archive you can copy into a project. The documentation APIs let an agent or tool search and ask questions without downloading anything.

## Agent Skills

The Windwalker documentation, in the same scope as `llms.txt`, is published with every site build as a zip archive. The archive contains flat Markdown files, and every link inside them is relative, so the directory can be copied into any project as it is.

<ul class="vp-raw">
  <li><a href="/llms.txt">llms.txt</a>: the online documentation index for LLMs</li>
  <li><a :href="zipUrl">skills.zip</a>: the archive</li>
  <li><a :href="checksumUrl">skills.zip.sha256</a>: the checksum file</li>
  <li><a href="/skills/README.md">skills/README.md</a>: the index, same structure as <code>llms.txt</code> with relative links</li>
</ul>

### Checksum

The archive built with this site has the following SHA-256 checksum:

<code class="skills-sha256">{{ sha256 }}</code>

The archive contains {{ fileCount }} Markdown files.

Download, verify, and extract the archive in one command. The command stops before extraction if the checksum does not match:

```bash
SHA=__SKILLS_SHA256__

curl -fsSLO https://windwalker.io/skills.zip && \
  echo "$SHA  skills.zip" | { if command -v shasum >/dev/null 2>&1; then shasum -a 256 -c; else sha256sum -c; fi; } && \
  unzip -q skills.zip -d skills
```

The `v` parameter changes with every build, so a cached copy of an older archive is never used.

The checksum step prints `skills.zip: OK` when the archive matches. Then the files are in `./skills/`, starting with `skills/README.md`.

::: info
The checksum and the archive come from the same site, so this check detects a corrupted or incomplete download. It does not prove that the archive was not replaced on the server.
:::

## Documentation APIs

Besides the archive, the same documentation is searchable over three HTTP APIs. Use them when an agent or tool needs the current Windwalker docs without downloading the whole archive.

### Search API

The endpoint is:

```text
POST https://docs-search.windwalker.io/search
```

Send a `POST` request with a JSON body that contains `query`. The response lists the matching chunks in `result.chunks`, and each chunk has its text, score, and source URL in `item.key`.

```bash
curl -sS -X POST https://docs-search.windwalker.io/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "router"}'
```

```json
{
  "success": true,
  "result": {
    "query_kind": "text",
    "search_query": "router",
    "chunks": [
      {
        "score": 1,
        "text": "...",
        "item": { "key": "https://windwalker.io/documentation/..." }
      }
    ]
  }
}
```

Use `ai_search_options.retrieval` to tune the search, for example `retrieval_type` (`vector`, `keyword`, or `hybrid`) and `max_num_results` (1 to 50).

```bash
curl -sS -X POST https://docs-search.windwalker.io/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "dependency injection",
    "ai_search_options": {
      "retrieval": {
        "retrieval_type": "hybrid",
        "max_num_results": 5
      }
    }
  }'
```

### Chat API

The endpoint is:

```text
POST https://docs-search.windwalker.io/chat/completions
```

It follows the OpenAI `chat/completions` format. Send the conversation in `messages`, and read the answer from `choices[0].message.content`. The server chooses the model.

```bash
curl -sS -X POST https://docs-search.windwalker.io/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      { "role": "user", "content": "How do I define a route?" }
    ]
  }'
```

```json
{
  "object": "chat.completion",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "### Defining a Route\n..."
      }
    }
  ]
}
```

::: tip
Use the Search API when you need the source text, and the Chat API when you need a ready-made answer. Answers from the Chat API are generated, so check them against the linked documentation.
:::

### MCP Server

The endpoint is:

```text
https://docs-search.windwalker.io/mcp
```

It uses the streamable HTTP transport. It exposes one tool, `search`, which takes the same `query` argument as the Search API. Any MCP client can connect to it by URL.

#### Configure MCP in a Project

Add the server to the MCP configuration file of your tool. For Claude Code and other clients that read `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "windwalker-docs": {
      "type": "http",
      "url": "https://docs-search.windwalker.io/mcp"
    }
  }
}
```

For VS Code, put the same server under `servers` in `.vscode/mcp.json`:

```json
{
  "servers": {
    "windwalker-docs": {
      "type": "http",
      "url": "https://docs-search.windwalker.io/mcp"
    }
  }
}
```

Restart the client or reload its MCP servers after you save the file. Then ask the agent to search the Windwalker docs, and it calls the `search` tool.

<script setup>
const sha256 = __SKILLS_SHA256__
const version = __SKILLS_VERSION__
const fileCount = __SKILLS_FILE_COUNT__
const zipUrl = `/skills.zip?v=${version}`
const checksumUrl = `/skills.zip.sha256?v=${version}`
</script>
