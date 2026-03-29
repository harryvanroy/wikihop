import type { WikiArticle } from '@wikihop/shared';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'WikiHop/1.0 (https://github.com/wikihop; wikihop@example.com)';

// Simple in-memory cache (replace with Redis for production)
const articleCache = new Map<string, { data: WikiArticle; expiresAt: number }>();
const linkCache = new Map<string, { data: string[]; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function wikiApi(params: Record<string, string>): Promise<unknown> {
  const url = new URL(WIKI_API);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Wikipedia API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function fetchArticleLinks(title: string): Promise<string[]> {
  const cached = linkCache.get(title);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const links: string[] = [];
  let plcontinue: string | undefined;

  do {
    const params: Record<string, string> = {
      action: 'query',
      titles: title,
      prop: 'links',
      pllimit: '500',
      plnamespace: '0', // main namespace only
    };
    if (plcontinue) params.plcontinue = plcontinue;

    const data = (await wikiApi(params)) as {
      query: { pages: Record<string, { links?: Array<{ title: string }> }> };
      continue?: { plcontinue: string };
    };

    const pages = data.query.pages;
    const page = Object.values(pages)[0];
    if (page?.links) {
      links.push(...page.links.map((l) => l.title));
    }

    plcontinue = data.continue?.plcontinue;
  } while (plcontinue);

  linkCache.set(title, { data: links, expiresAt: Date.now() + CACHE_TTL });
  return links;
}

export async function fetchArticleHtml(title: string): Promise<{ html: string; pageid: number }> {
  const data = (await wikiApi({
    action: 'parse',
    page: title,
    prop: 'text',
    redirects: '1',
  })) as {
    parse: { title: string; pageid: number; text: { '*': string } };
  };

  return {
    html: data.parse.text['*'],
    pageid: data.parse.pageid,
  };
}

export async function fetchArticle(
  title: string,
  fields: string[] = ['html', 'links']
): Promise<Partial<WikiArticle>> {
  const cached = articleCache.get(title);
  if (cached && cached.expiresAt > Date.now()) {
    const result: Partial<WikiArticle> = { title: cached.data.title, pageid: cached.data.pageid };
    if (fields.includes('html')) result.html = cached.data.html;
    if (fields.includes('links')) result.links = cached.data.links;
    return result;
  }

  const result: Partial<WikiArticle> = { title };

  if (fields.includes('html')) {
    const { html, pageid } = await fetchArticleHtml(title);
    result.html = html;
    result.pageid = pageid;
  }

  if (fields.includes('links')) {
    result.links = await fetchArticleLinks(title);
  }

  if (result.html && result.links && result.pageid) {
    articleCache.set(title, {
      data: { title, pageid: result.pageid, html: result.html, links: result.links },
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  return result;
}

export async function fetchRandomArticles(count: number): Promise<Array<{ title: string; id: number }>> {
  const data = (await wikiApi({
    action: 'query',
    list: 'random',
    rnnamespace: '0',
    rnlimit: String(count * 3), // fetch extra to filter
  })) as {
    query: { random: Array<{ id: number; title: string }> };
  };

  return data.query.random.slice(0, count).map((a) => ({ title: a.title, id: a.id }));
}

/** Clear all caches. Used for testing. */
export function clearCache() {
  articleCache.clear();
  linkCache.clear();
}
