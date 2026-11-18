---
layout: doc
---

# Maintenance

The maintenance commands put the site into maintenance mode while you
deploy, migrate, or repair data. Visitors see a maintenance page, and
selected IP addresses or a secret URL can still reach the site. This
page also covers the cache commands, which usually run in the same
deployment step.

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

## Clearing Cache Files

`cache:clear` deletes files under the `WINDWALKER_CACHE` directory. It
keeps the `.gitignore`, `.htaccess`, and `web.config` files.

```bash
php windwalker cache:clear
php windwalker cache:clear views routes
```

With no arguments, everything is cleared. With folder names, only those
folders under the cache directory are cleared.

::: warning
`cache:clear` with no arguments removes all cache files. Running it on
a busy production site causes the next requests to rebuild the caches.
Clear specific folders when you can.
:::

## Purging Cache Pools

`cache:purge` works on the cache pools defined in
`cache.factories.instances`.

```bash
php windwalker cache:purge
php windwalker cache:purge default session
php windwalker cache:purge -g users
php windwalker cache:purge -t product -t price
```

- Profile arguments: the pool profiles to purge. With none, all
  profiles are purged.
- `-g, --group`: clear one or more cache groups. Repeat the option to
  clear several groups.
- `-t, --tag`: invalidate one or more tags. Repeat the option for more
  tags.

An unknown profile name prints an error and the command continues with
the next profile.

::: tip
Tags are the cleanest way to invalidate related values. Tag cache items
when you store them, and purge the tag when the underlying data changes.
:::

Both commands complete profile, group, and tag names in the shell. See
[Basic Commands](../basic-commands#shell-completion) for the setup.

## Typical Deployment

```bash
php windwalker site:down -p 203.0.113.10
php windwalker mig:go
php windwalker cache:clear
php windwalker site:up
```

Keep the downtime short. Run migrations first, then clear caches, then
bring the site back online.

