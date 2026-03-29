import {
  MIN_ARTICLE_LINKS,
  TARGET_DEPTH,
  RANDOM_ARTICLE_BATCH_SIZE,
  MAX_PAIR_RETRIES,
} from '@wikihop/shared';
import { fetchArticleLinks, fetchRandomArticles } from './wikipediaProxy';
import { isExcludedTitle } from './popularArticles';

interface ArticlePair {
  startArticle: string;
  targetArticle: string;
}

/**
 * BFS from startArticle to find a target article at exactly `depth` hops away.
 * Returns the target title, or null if none found within budget.
 */
export async function findTargetByBFS(
  startArticle: string,
  depth: number
): Promise<string | null> {
  let frontier = [startArticle];
  const visited = new Set<string>([startArticle]);

  for (let d = 0; d < depth; d++) {
    const nextFrontier: string[] = [];

    // On each level, only sample a subset of the frontier to limit API calls
    const sampled = frontier.length > 5 ? shuffle(frontier).slice(0, 5) : frontier;

    const linkResults = await Promise.all(
      sampled.map((title) => fetchArticleLinks(title).catch(() => [] as string[]))
    );

    for (const links of linkResults) {
      for (const link of links) {
        if (!visited.has(link) && !isExcludedTitle(link)) {
          visited.add(link);
          nextFrontier.push(link);
        }
      }
    }

    if (nextFrontier.length === 0) return null;
    frontier = nextFrontier;
  }

  // Pick a random article from the final frontier that has enough links
  const candidates = shuffle(frontier);
  for (const candidate of candidates.slice(0, 10)) {
    try {
      const links = await fetchArticleLinks(candidate);
      if (links.length >= MIN_ARTICLE_LINKS) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Pick a valid random start article: not excluded, has enough links.
 */
async function pickStartArticle(): Promise<string | null> {
  const randoms = await fetchRandomArticles(RANDOM_ARTICLE_BATCH_SIZE);

  for (const { title } of randoms) {
    if (isExcludedTitle(title)) continue;

    try {
      const links = await fetchArticleLinks(title);
      if (links.length >= MIN_ARTICLE_LINKS) {
        return title;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Generate a valid article pair using BFS:
 * 1. Pick a random start article with enough links
 * 2. BFS outward to find a target at TARGET_DEPTH hops away
 * 3. This guarantees the target is reachable and controls difficulty
 */
export async function generateValidArticlePair(maxRetries = MAX_PAIR_RETRIES): Promise<ArticlePair> {
  for (let i = 0; i < maxRetries; i++) {
    const startArticle = await pickStartArticle();
    if (!startArticle) continue;

    const targetArticle = await findTargetByBFS(startArticle, TARGET_DEPTH);
    if (targetArticle) {
      return { startArticle, targetArticle };
    }
  }

  // Fallback to known-good articles
  return {
    startArticle: 'United States',
    targetArticle: 'Philosophy',
  };
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
