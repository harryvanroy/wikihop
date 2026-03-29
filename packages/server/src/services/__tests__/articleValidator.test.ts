import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../wikipediaProxy', () => ({
  fetchArticleLinks: vi.fn(),
  fetchRandomArticles: vi.fn(),
}));

vi.mock('../popularArticles', () => ({
  isExcludedTitle: vi.fn(),
}));

import { fetchArticleLinks, fetchRandomArticles } from '../wikipediaProxy';
import { isExcludedTitle } from '../popularArticles';
import { generateValidArticlePair, findTargetByBFS } from '../articleValidator';

const mockedFetchArticleLinks = vi.mocked(fetchArticleLinks);
const mockedFetchRandomArticles = vi.mocked(fetchRandomArticles);
const mockedIsExcludedTitle = vi.mocked(isExcludedTitle);

beforeEach(() => {
  vi.clearAllMocks();
  mockedIsExcludedTitle.mockReturnValue(false);
});

describe('findTargetByBFS', () => {
  it('finds a target at the specified depth', async () => {
    // Depth 2: Start -> A -> Target
    mockedFetchArticleLinks
      .mockResolvedValueOnce(['ArticleA', 'ArticleB']) // links from Start
      .mockResolvedValueOnce(['Target1', 'Target2']) // links from ArticleA
      .mockResolvedValueOnce(['Target3']) // links from ArticleB
      .mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => `Link${i}`)); // validate Target1

    const result = await findTargetByBFS('Start', 2);

    expect(result).toBeTruthy();
  });

  it('returns null when BFS hits a dead end', async () => {
    mockedFetchArticleLinks.mockResolvedValue([]);

    const result = await findTargetByBFS('DeadEnd', 2);

    expect(result).toBeNull();
  });

  it('skips excluded titles during BFS', async () => {
    mockedIsExcludedTitle.mockImplementation((title) => title === 'BadArticle');

    mockedFetchArticleLinks
      .mockResolvedValueOnce(['BadArticle', 'GoodArticle']) // depth 1
      .mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => `Target${i}`)) // depth 2 from GoodArticle
      .mockResolvedValueOnce(Array.from({ length: 25 }, (_, i) => `Link${i}`)); // validate target

    const result = await findTargetByBFS('Start', 2);

    expect(result).toBeTruthy();
    expect(result).not.toBe('BadArticle');
  });

  it('returns null when targets have too few links', async () => {
    mockedFetchArticleLinks
      .mockResolvedValueOnce(['ArticleA']) // depth 1
      .mockResolvedValueOnce(['Target1', 'Target2']) // depth 2
      .mockResolvedValueOnce(['Link1', 'Link2']) // validate Target1 - too few
      .mockResolvedValueOnce(['Link1']); // validate Target2 - too few

    const result = await findTargetByBFS('Start', 2);

    expect(result).toBeNull();
  });
});

describe('generateValidArticlePair', () => {
  it('returns a valid pair using BFS', async () => {
    mockedFetchRandomArticles.mockResolvedValueOnce([
      { title: 'Mathematics', id: 1 },
      { title: 'Science', id: 2 },
    ]);

    // pickStartArticle validates link count
    const manyLinks = Array.from({ length: 25 }, (_, i) => `Link${i}`);
    mockedFetchArticleLinks
      .mockResolvedValueOnce(manyLinks) // validate Mathematics as start
      // BFS depth 1
      .mockResolvedValueOnce(['Mid1', 'Mid2'])
      // BFS depth 2
      .mockResolvedValueOnce(['Mid3', 'Mid4'])
      .mockResolvedValueOnce(['Mid5'])
      // BFS depth 3
      .mockResolvedValueOnce(['Mid6'])
      .mockResolvedValueOnce(['Mid7'])
      .mockResolvedValueOnce(['Mid8'])
      // BFS depth 4
      .mockResolvedValueOnce(['Target1'])
      .mockResolvedValueOnce(['Target2'])
      .mockResolvedValueOnce(['Target3'])
      // validate target
      .mockResolvedValueOnce(manyLinks);

    const result = await generateValidArticlePair();

    expect(result.startArticle).toBe('Mathematics');
    expect(result.targetArticle).toBeTruthy();
  });

  it('falls back to known-good articles after maxRetries', async () => {
    // All random articles have too few links
    for (let i = 0; i < 5; i++) {
      mockedFetchRandomArticles.mockResolvedValueOnce([
        { title: `Stub${i}`, id: i },
      ]);
      mockedFetchArticleLinks.mockResolvedValueOnce(['Link1', 'Link2']);
    }

    const result = await generateValidArticlePair();

    expect(result.startArticle).toBe('United States');
    expect(result.targetArticle).toBe('Philosophy');
  });

  it('skips excluded random articles and tries next', async () => {
    mockedIsExcludedTitle.mockImplementation((title) => title === 'List of things');

    mockedFetchRandomArticles.mockResolvedValueOnce([
      { title: 'List of things', id: 1 },
      { title: 'Good Article', id: 2 },
    ]);

    const manyLinks = Array.from({ length: 25 }, (_, i) => `Link${i}`);
    mockedFetchArticleLinks
      .mockResolvedValueOnce(manyLinks) // validate Good Article
      // BFS levels
      .mockResolvedValueOnce(['A'])
      .mockResolvedValueOnce(['B'])
      .mockResolvedValueOnce(['C'])
      .mockResolvedValueOnce(['Target'])
      .mockResolvedValueOnce(manyLinks); // validate target

    const result = await generateValidArticlePair();

    expect(result.startArticle).toBe('Good Article');
  });

  it('respects custom maxRetries parameter', async () => {
    mockedFetchRandomArticles.mockResolvedValue([]);

    const result = await generateValidArticlePair(2);

    expect(result.startArticle).toBe('United States');
    expect(result.targetArticle).toBe('Philosophy');
    expect(mockedFetchRandomArticles).toHaveBeenCalledTimes(2);
  });
});
