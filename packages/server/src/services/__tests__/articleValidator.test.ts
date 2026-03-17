import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../wikipediaProxy', () => ({
  fetchArticleLinks: vi.fn(),
}));

vi.mock('../popularArticles', () => ({
  pickPopularArticles: vi.fn(),
}));

import { fetchArticleLinks } from '../wikipediaProxy';
import { pickPopularArticles } from '../popularArticles';
import { generateValidArticlePair } from '../articleValidator';

const mockedFetchArticleLinks = vi.mocked(fetchArticleLinks);
const mockedPickPopularArticles = vi.mocked(pickPopularArticles);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateValidArticlePair', () => {
  it('returns a valid pair when both articles have enough links', async () => {
    mockedPickPopularArticles.mockResolvedValueOnce([
      { title: 'Mathematics' },
      { title: 'Science' },
    ]);

    mockedFetchArticleLinks
      .mockResolvedValueOnce(Array.from({ length: 15 }, (_, i) => `Link${i}`))
      .mockResolvedValueOnce(Array.from({ length: 12 }, (_, i) => `Link${i}`));

    const result = await generateValidArticlePair();

    expect(result.startArticle).toBe('Mathematics');
    expect(result.targetArticle).toBe('Science');
  });

  it('retries when articles have too few links, then succeeds', async () => {
    // First attempt: articles with too few links
    mockedPickPopularArticles.mockResolvedValueOnce([
      { title: 'Stub1' },
      { title: 'Stub2' },
    ]);
    mockedFetchArticleLinks
      .mockResolvedValueOnce(['Link1', 'Link2'])
      .mockResolvedValueOnce(['Link1', 'Link2', 'Link3']);

    // Second attempt: articles with enough links
    mockedPickPopularArticles.mockResolvedValueOnce([
      { title: 'GoodArticle1' },
      { title: 'GoodArticle2' },
    ]);
    mockedFetchArticleLinks
      .mockResolvedValueOnce(Array.from({ length: 20 }, (_, i) => `Link${i}`))
      .mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => `Link${i}`));

    const result = await generateValidArticlePair();

    expect(result.startArticle).toBe('GoodArticle1');
    expect(result.targetArticle).toBe('GoodArticle2');
    expect(mockedPickPopularArticles).toHaveBeenCalledTimes(2);
  });

  it('falls back to known-good articles after maxRetries', async () => {
    for (let i = 0; i < 5; i++) {
      mockedPickPopularArticles.mockResolvedValueOnce([
        { title: `Stub${i}a` },
        { title: `Stub${i}b` },
      ]);
      mockedFetchArticleLinks
        .mockResolvedValueOnce(['Link1'])
        .mockResolvedValueOnce(['Link1', 'Link2']);
    }

    const result = await generateValidArticlePair();

    expect(result.startArticle).toBe('United States');
    expect(result.targetArticle).toBe('Philosophy');
    expect(mockedPickPopularArticles).toHaveBeenCalledTimes(5);
  });

  it('falls back when pickPopularArticles returns fewer than 2 candidates', async () => {
    for (let i = 0; i < 5; i++) {
      mockedPickPopularArticles.mockResolvedValueOnce([]);
    }

    const result = await generateValidArticlePair();

    expect(result.startArticle).toBe('United States');
    expect(result.targetArticle).toBe('Philosophy');
  });

  it('respects the custom maxRetries parameter', async () => {
    for (let i = 0; i < 2; i++) {
      mockedPickPopularArticles.mockResolvedValueOnce([
        { title: `Stub${i}a` },
        { title: `Stub${i}b` },
      ]);
      mockedFetchArticleLinks
        .mockResolvedValueOnce(['Link1'])
        .mockResolvedValueOnce(['Link1']);
    }

    const result = await generateValidArticlePair(2);

    expect(result.startArticle).toBe('United States');
    expect(result.targetArticle).toBe('Philosophy');
    expect(mockedPickPopularArticles).toHaveBeenCalledTimes(2);
  });
});
