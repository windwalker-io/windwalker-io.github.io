---
layout: doc
---

# Maintenance

The maintenance commands put the site into maintenance mode while you
deploy, migrate, or repair data. Visitors see a maintenance page, and
selected IP addresses or a secret URL can still reach the site.

## Enabling Maintenance Mode

```bash
php windwalker site:down
```

Options:

- `-p, --allow-ips`: IP addresses that can still reach the site.
- `-r, --redirect`: a URL to redirect visitors to.
- `-s, --secret`: a secret value that lets a visitor bypass the page.
- `-t, --template`: a template to render for the maintenance page.

```bash
php windwalker site:down -p 203.0.113.10 -s deploy-2024
```

With a secret, the visitor can bypass the maintenance page. Keep the
secret out of logs and shared documents.

::: warning
A secret in a URL can be stored in browser history, server logs, and
proxy logs. Use a short-lived secret, and run `site:up` as soon as the
work is done.
:::

## Disabling Maintenance Mode

```bash
php windwalker site:up
```

`site:up` brings the site back online. If the site is already online,
the command prints `No actions` and exits with code `1`.

```bash
php windwalker site:up
echo $?
# 1 when the site was already online
```

## Typical Deployment

```bash
php windwalker site:down -p 203.0.113.10
php windwalker mig:go
php windwalker cache:clear
php windwalker site:up
```

Keep the downtime short. Run migrations first, then clear caches, then
bring the site back online.

