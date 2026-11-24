import { DefaultTheme } from 'vitepress';

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function findParentMatch(
  items: DefaultTheme.SidebarItem[],
  url: string,
  parentText?: string,
  depth = 0,
): { text: string; depth: number } | undefined {
  let best: { text: string; depth: number } | undefined;

  for (const item of items) {
    if (item.link && normalizeUrl(item.link) === url && parentText) {
      best = { text: parentText, depth };
    }

    if (item.items) {
      const child = findParentMatch(item.items, url, item.text, depth + 1);

      if (child && (!best || child.depth > best.depth)) {
        best = child;
      }
    }
  }

  return best;
}

/**
 * Returns the sidebar parent text (group or parent item) of a page.
 * The deepest matching entry wins when the same link appears at several levels.
 * Returns undefined for the section root, or for pages not in the sidebar.
 */
export function findSidebarParentText(
  sidebar: DefaultTheme.SidebarItem[],
  relativePath: string,
  sectionRoot: string,
): string | undefined {
  const url = normalizeUrl(
    '/' + relativePath
      .replace(/\.md$/, '')
      .replace(/(^|\/)index$/, ''),
  );

  if (url === normalizeUrl(sectionRoot)) {
    return undefined;
  }

  return findParentMatch(sidebar, url)?.text;
}
