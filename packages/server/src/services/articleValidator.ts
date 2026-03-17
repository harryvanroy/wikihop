import { MIN_ARTICLE_LINKS } from '@wikihop/shared';
import { fetchArticleLinks } from './wikipediaProxy';
import { pickPopularArticles } from './popularArticles';

interface ArticlePair {
  startArticle: string;
  targetArticle: string;
}

export async function generateValidArticlePair(maxRetries = 5): Promise<ArticlePair> {
  for (let i = 0; i < maxRetries; i++) {
    const candidates = await pickPopularArticles(2);
    if (candidates.length < 2) continue;

    const [start, target] = candidates;

    // Validate both articles have enough links
    const [startLinks, targetLinks] = await Promise.all([
      fetchArticleLinks(start.title),
      fetchArticleLinks(target.title),
    ]);

    if (startLinks.length >= MIN_ARTICLE_LINKS && targetLinks.length >= MIN_ARTICLE_LINKS) {
      return { startArticle: start.title, targetArticle: target.title };
    }
  }

  // Fallback to known-good articles
  return {
    startArticle: 'United States',
    targetArticle: 'Philosophy',
  };
}
