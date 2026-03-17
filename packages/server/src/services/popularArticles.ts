import {
  POPULAR_ARTICLES_REFRESH_MS,
  POPULAR_ARTICLES_MIN_POOL_SIZE,
  POPULAR_ARTICLES_FETCH_DAYS,
  EXCLUDED_TITLE_PREFIXES,
  EXCLUDED_TITLE_PATTERNS,
} from '@wikihop/shared';
import { fetchTopArticles } from './wikipediaProxy';

interface PopularArticlePool {
  articles: string[];
  refreshedAt: number;
}

let pool: PopularArticlePool | null = null;
let refreshPromise: Promise<void> | null = null;

/**
 * Check if a title should be excluded from the popular articles pool.
 */
export function isExcludedTitle(title: string): boolean {
  for (const prefix of EXCLUDED_TITLE_PREFIXES) {
    if (title.startsWith(prefix)) return true;
  }
  for (const pattern of EXCLUDED_TITLE_PATTERNS) {
    if (pattern.test(title)) return true;
  }
  return false;
}

/**
 * Fetch top articles for the last N days, merge and deduplicate,
 * then filter out unsuitable titles.
 */
async function fetchAndFilterPool(): Promise<string[]> {
  const allArticles = new Map<string, number>(); // title -> total views

  const now = new Date();
  const promises: Promise<void>[] = [];

  // Start from yesterday since today's data is incomplete
  for (let i = 1; i <= POPULAR_ARTICLES_FETCH_DAYS; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    promises.push(
      fetchTopArticles(year, month, day)
        .then((articles) => {
          for (const { title, views } of articles) {
            allArticles.set(title, (allArticles.get(title) || 0) + views);
          }
        })
        .catch((err) => {
          console.warn(`Failed to fetch top articles for ${year}-${month}-${day}:`, err);
        })
    );
  }

  await Promise.all(promises);

  // Sort by total views descending, filter out unsuitable titles
  return Array.from(allArticles.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([title]) => title)
    .filter((title) => !isExcludedTitle(title));
}

/**
 * Ensure the pool is loaded and fresh. Uses a singleton promise
 * to prevent concurrent refreshes (thundering herd).
 */
export async function ensurePool(): Promise<string[]> {
  const now = Date.now();

  if (pool && now - pool.refreshedAt < POPULAR_ARTICLES_REFRESH_MS) {
    return pool.articles;
  }

  if (!refreshPromise) {
    refreshPromise = fetchAndFilterPool()
      .then((articles) => {
        if (articles.length >= POPULAR_ARTICLES_MIN_POOL_SIZE) {
          pool = { articles, refreshedAt: now };
        } else if (!pool) {
          // First load with too few articles — use what we have
          console.warn(
            `Popular articles pool only has ${articles.length} articles (min: ${POPULAR_ARTICLES_MIN_POOL_SIZE})`
          );
          pool = { articles, refreshedAt: now };
        }
        // If stale pool exists and refresh gave too few results, keep stale pool
      })
      .catch((err) => {
        console.error('Failed to refresh popular articles pool:', err);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  await refreshPromise;
  return pool?.articles ?? [];
}

/**
 * Pick `count` random articles from the popular pool.
 * Returns articles with guaranteed distinct titles.
 */
export async function pickPopularArticles(
  count: number
): Promise<Array<{ title: string }>> {
  const articles = await ensurePool();

  if (articles.length < count) {
    return [];
  }

  // Fisher-Yates partial shuffle to pick `count` unique items
  const indices = Array.from({ length: articles.length }, (_, i) => i);
  const picked: string[] = [];

  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (indices.length - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
    picked.push(articles[indices[i]]);
  }

  return picked.map((title) => ({ title }));
}

/** Reset pool state. Used for testing. */
export function resetPool() {
  pool = null;
  refreshPromise = null;
}
